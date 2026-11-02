-- =============================================================================
-- 0004_institutions.sql — multi-institution tenancy and role semantics
--
--   super_admin = platform owner / developer. Sees every institution, creates
--                 institutions, provisions institution heads. Not tied to data.
--   admin       = institution head. Manages staff, subjects, bank and branding
--                 for their own institution only.
--   teacher     = paper generator. Reads the active bank of their institution,
--                 manages their own drafts and their own papers.
--
-- Run order: 0001 → 0002 → 0003 → 0004.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. institutions
-- ---------------------------------------------------------------------------
create table if not exists public.institutions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tagline       text,
  address       text,
  logo_url      text,
  exam_session  text,
  footer_note   text,
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. tenant columns
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists institution_id uuid
  references public.institutions (id) on delete set null;

alter table public.subjects
  add column if not exists institution_id uuid
  references public.institutions (id) on delete cascade;

alter table public.questions
  add column if not exists institution_id uuid
  references public.institutions (id) on delete cascade;

alter table public.papers
  add column if not exists institution_id uuid
  references public.institutions (id) on delete cascade;

create index if not exists users_institution_id_idx on public.users (institution_id);
create index if not exists subjects_institution_id_idx on public.subjects (institution_id);
create index if not exists questions_institution_id_idx on public.questions (institution_id);
create index if not exists papers_institution_id_idx on public.papers (institution_id);

-- ---------------------------------------------------------------------------
-- 3. migrate the legacy singleton into a real institution row
-- ---------------------------------------------------------------------------
do $$
declare
  v_institution uuid;
begin
  select id into v_institution from public.institutions order by created_at limit 1;

  if v_institution is null and to_regclass('public.institution_settings') is not null then
    insert into public.institutions (name, tagline, address, logo_url, exam_session, footer_note)
    select name, tagline, address, logo_url, exam_session, footer_note
    from public.institution_settings
    where id = true
    returning id into v_institution;
  end if;

  if v_institution is null then
    insert into public.institutions (name) values ('Your Institution')
    returning id into v_institution;
  end if;
end $$;

-- Backfill every existing row onto that institution. Super admins stay unassigned:
-- they are the developer role and operate across institutions.
do $$
declare
  v_institution uuid;
begin
  select id into v_institution from public.institutions order by created_at limit 1;

  update public.subjects  set institution_id = v_institution where institution_id is null;
  update public.questions set institution_id = v_institution where institution_id is null;
  update public.papers    set institution_id = v_institution where institution_id is null;
  update public.users     set institution_id = v_institution
    where institution_id is null and role <> 'super_admin';
end $$;

alter table public.subjects  alter column institution_id set not null;
alter table public.questions alter column institution_id set not null;
alter table public.papers    alter column institution_id set not null;

-- Subject names are unique per institution, not globally.
alter table public.subjects drop constraint if exists subjects_class_subject_key;
alter table public.subjects drop constraint if exists subjects_institution_class_subject_key;
alter table public.subjects
  add constraint subjects_institution_class_subject_key
  unique (institution_id, class_name, subject_name);

-- ---------------------------------------------------------------------------
-- 4. helpers — SECURITY DEFINER so policies never recurse into RLS
-- ---------------------------------------------------------------------------
create or replace function public.auth_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.institution_id
  from public.users u
  where u.id = auth.uid()
    and u.is_active = true
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = 'super_admin', false)
$$;

/** True when the current user may touch a row belonging to p_institution_id. */
create or replace function public.same_institution(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
      or (p_institution_id is not null and p_institution_id = public.auth_institution_id())
$$;

create or replace function public.can_manage_bank()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() in ('admin', 'super_admin'), false)
$$;

create or replace function public.subject_institution(p_subject_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.institution_id from public.subjects s where s.id = p_subject_id
$$;

create or replace function public.topic_institution(p_topic_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.institution_id
  from public.topics t
  join public.subjects s on s.id = t.subject_id
  where t.id = p_topic_id
$$;

create or replace function public.paper_institution(p_paper_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.institution_id from public.papers p where p.id = p_paper_id
$$;

create or replace function public.can_access_paper(p_paper_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.papers p
    where p.id = p_paper_id
      and public.same_institution(p.institution_id)
      and (p.created_by = auth.uid() or coalesce(public.auth_role() in ('admin', 'super_admin'), false))
  )
$$;

-- New rows inherit the author's institution unless the caller sets one.
alter table public.subjects  alter column institution_id set default public.auth_institution_id();
alter table public.questions alter column institution_id set default public.auth_institution_id();
alter table public.papers    alter column institution_id set default public.auth_institution_id();

-- ---------------------------------------------------------------------------
-- 5. profile trigger — carry institution_id from auth metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institution uuid;
begin
  begin
    v_institution := nullif(new.raw_user_meta_data ->> 'institution_id', '')::uuid;
  exception when others then
    v_institution := null;
  end;

  insert into public.users (id, email, full_name, role, institution_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'teacher',
    v_institution
  )
  on conflict (id) do update
    set email = excluded.email,
        institution_id = coalesce(users.institution_id, excluded.institution_id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. privilege guard — super admin anywhere, admin inside their institution
-- ---------------------------------------------------------------------------
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := public.auth_role();
begin
  -- Service-role calls (server-side provisioning) have no auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  -- The developer role may change anything.
  if v_role = 'super_admin' then
    return new;
  end if;

  if new.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'You cannot change your own role';
  end if;

  -- Nobody below the developer may lock themselves out of the platform.
  if new.id = auth.uid() and new.is_active is distinct from old.is_active then
    raise exception 'You cannot change your own account status';
  end if;

  if new.institution_id is distinct from old.institution_id then
    raise exception 'Only a super admin can move a user between institutions';
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active then
    if v_role = 'admin'
       and old.institution_id is not null
       and old.institution_id = public.auth_institution_id()
       and old.role <> 'super_admin'
       and new.role <> 'super_admin' then
      return new;
    end if;

    raise exception 'Only an institution admin or super admin can change a user role or status';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. RLS — every tenant table is scoped by institution
-- ---------------------------------------------------------------------------
alter table public.institutions enable row level security;

drop policy if exists "institutions_select" on public.institutions;
create policy "institutions_select"
  on public.institutions for select to authenticated
  using (public.same_institution(id));

drop policy if exists "institutions_insert" on public.institutions;
create policy "institutions_insert"
  on public.institutions for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "institutions_update" on public.institutions;
create policy "institutions_update"
  on public.institutions for update to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'admin' and id = public.auth_institution_id())
  )
  with check (
    public.is_super_admin()
    or (public.auth_role() = 'admin' and id = public.auth_institution_id())
  );

-- No delete policy: institutions are never removed through the API.

drop policy if exists "users_select_self_or_admin" on public.users;
drop policy if exists "users_select_scoped" on public.users;
create policy "users_select_scoped"
  on public.users for select to authenticated
  using (
    id = (select auth.uid())
    or (public.can_manage_bank() and public.same_institution(institution_id))
  );

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "users_update_super_admin" on public.users;
drop policy if exists "users_update_managers" on public.users;
create policy "users_update_managers"
  on public.users for update to authenticated
  using (public.can_manage_bank() and public.same_institution(institution_id))
  with check (public.can_manage_bank() and public.same_institution(institution_id));

drop policy if exists "users_delete_super_admin" on public.users;
create policy "users_delete_super_admin"
  on public.users for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "subjects_select_authenticated" on public.subjects;
drop policy if exists "subjects_select" on public.subjects;
create policy "subjects_select"
  on public.subjects for select to authenticated
  using (public.same_institution(institution_id));

drop policy if exists "subjects_write_admin" on public.subjects;
drop policy if exists "subjects_write" on public.subjects;
create policy "subjects_write"
  on public.subjects for all to authenticated
  using (public.can_manage_bank() and public.same_institution(institution_id))
  with check (public.can_manage_bank() and public.same_institution(institution_id));

drop policy if exists "topics_select_authenticated" on public.topics;
drop policy if exists "topics_select" on public.topics;
create policy "topics_select"
  on public.topics for select to authenticated
  using (public.same_institution(public.subject_institution(subject_id)));

drop policy if exists "topics_write_admin" on public.topics;
drop policy if exists "topics_write" on public.topics;
create policy "topics_write"
  on public.topics for all to authenticated
  using (public.can_manage_bank() and public.same_institution(public.subject_institution(subject_id)))
  with check (public.can_manage_bank() and public.same_institution(public.subject_institution(subject_id)));

drop policy if exists "questions_select" on public.questions;
create policy "questions_select"
  on public.questions for select to authenticated
  using (
    public.same_institution(institution_id)
    and (
      is_active = true
      or created_by = (select auth.uid())
      or public.can_manage_bank()
    )
  );

drop policy if exists "questions_insert" on public.questions;
create policy "questions_insert"
  on public.questions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and institution_id = public.auth_institution_id()
    and public.topic_institution(topic_id) = institution_id
  );

drop policy if exists "questions_update" on public.questions;
create policy "questions_update"
  on public.questions for update to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  )
  with check (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
    and public.topic_institution(topic_id) = institution_id
  );

drop policy if exists "questions_delete" on public.questions;
create policy "questions_delete"
  on public.questions for delete to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  );

drop policy if exists "papers_select" on public.papers;
create policy "papers_select"
  on public.papers for select to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  );

drop policy if exists "papers_insert" on public.papers;
create policy "papers_insert"
  on public.papers for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and institution_id = public.auth_institution_id()
    and (subject_id is null or public.subject_institution(subject_id) = institution_id)
  );

drop policy if exists "papers_update" on public.papers;
create policy "papers_update"
  on public.papers for update to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  )
  with check (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
    and (subject_id is null or public.subject_institution(subject_id) = institution_id)
  );

drop policy if exists "papers_delete" on public.papers;
create policy "papers_delete"
  on public.papers for delete to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  );

-- paper_sets / paper_questions keep following the parent paper; can_access_paper
-- now includes the institution check, so those policies need no change.

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
grant select, insert, update on public.institutions to authenticated;

-- NOTE: public.institution_settings is left in place (read-only legacy) so a
-- Worker still running the previous build keeps rendering during the deploy
-- window. Drop it in a follow-up migration once the new build is live.
