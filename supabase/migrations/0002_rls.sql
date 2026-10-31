-- =============================================================================
-- 0002_rls.sql — row level security
-- Every application read/write goes through the anon key + the user's JWT.
-- The service-role key is only used for user provisioning on the server.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies do not recurse into public.users RLS)
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.is_active = true
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
      and (p.created_by = auth.uid() or coalesce(public.auth_role() in ('admin', 'super_admin'), false))
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.users                enable row level security;
alter table public.subjects             enable row level security;
alter table public.topics               enable row level security;
alter table public.questions            enable row level security;
alter table public.papers               enable row level security;
alter table public.paper_sets           enable row level security;
alter table public.paper_questions      enable row level security;
alter table public.institution_settings enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
  on public.users for select to authenticated
  using (
    id = (select auth.uid())
    or coalesce(public.auth_role() in ('admin', 'super_admin'), false)
  );

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "users_update_super_admin" on public.users;
create policy "users_update_super_admin"
  on public.users for update to authenticated
  using (public.auth_role() = 'super_admin')
  with check (public.auth_role() = 'super_admin');

drop policy if exists "users_delete_super_admin" on public.users;
create policy "users_delete_super_admin"
  on public.users for delete to authenticated
  using (public.auth_role() = 'super_admin');

-- ---------------------------------------------------------------------------
-- subjects / topics — read for everyone signed in, write for admins
-- ---------------------------------------------------------------------------
drop policy if exists "subjects_select_authenticated" on public.subjects;
create policy "subjects_select_authenticated"
  on public.subjects for select to authenticated
  using (true);

drop policy if exists "subjects_write_admin" on public.subjects;
create policy "subjects_write_admin"
  on public.subjects for all to authenticated
  using (public.can_manage_bank())
  with check (public.can_manage_bank());

drop policy if exists "topics_select_authenticated" on public.topics;
create policy "topics_select_authenticated"
  on public.topics for select to authenticated
  using (true);

drop policy if exists "topics_write_admin" on public.topics;
create policy "topics_write_admin"
  on public.topics for all to authenticated
  using (public.can_manage_bank())
  with check (public.can_manage_bank());

-- ---------------------------------------------------------------------------
-- questions — teachers read the shared active bank and manage their own drafts
-- ---------------------------------------------------------------------------
drop policy if exists "questions_select" on public.questions;
create policy "questions_select"
  on public.questions for select to authenticated
  using (
    is_active = true
    or created_by = (select auth.uid())
    or public.can_manage_bank()
  );

drop policy if exists "questions_insert" on public.questions;
create policy "questions_insert"
  on public.questions for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "questions_update" on public.questions;
create policy "questions_update"
  on public.questions for update to authenticated
  using (created_by = (select auth.uid()) or public.can_manage_bank())
  with check (created_by = (select auth.uid()) or public.can_manage_bank());

drop policy if exists "questions_delete" on public.questions;
create policy "questions_delete"
  on public.questions for delete to authenticated
  using (created_by = (select auth.uid()) or public.can_manage_bank());

-- ---------------------------------------------------------------------------
-- papers
-- ---------------------------------------------------------------------------
drop policy if exists "papers_select" on public.papers;
create policy "papers_select"
  on public.papers for select to authenticated
  using (created_by = (select auth.uid()) or public.can_manage_bank());

drop policy if exists "papers_insert" on public.papers;
create policy "papers_insert"
  on public.papers for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "papers_update" on public.papers;
create policy "papers_update"
  on public.papers for update to authenticated
  using (created_by = (select auth.uid()) or public.can_manage_bank())
  with check (created_by = (select auth.uid()) or public.can_manage_bank());

drop policy if exists "papers_delete" on public.papers;
create policy "papers_delete"
  on public.papers for delete to authenticated
  using (created_by = (select auth.uid()) or public.can_manage_bank());

-- ---------------------------------------------------------------------------
-- paper_sets / paper_questions — access follows the parent paper
-- ---------------------------------------------------------------------------
drop policy if exists "paper_sets_select" on public.paper_sets;
create policy "paper_sets_select"
  on public.paper_sets for select to authenticated
  using (public.can_access_paper(paper_id));

drop policy if exists "paper_sets_write" on public.paper_sets;
create policy "paper_sets_write"
  on public.paper_sets for all to authenticated
  using (public.can_access_paper(paper_id))
  with check (public.can_access_paper(paper_id));

drop policy if exists "paper_questions_select" on public.paper_questions;
create policy "paper_questions_select"
  on public.paper_questions for select to authenticated
  using (
    exists (
      select 1 from public.paper_sets s
      where s.id = paper_set_id and public.can_access_paper(s.paper_id)
    )
  );

drop policy if exists "paper_questions_write" on public.paper_questions;
create policy "paper_questions_write"
  on public.paper_questions for all to authenticated
  using (
    exists (
      select 1 from public.paper_sets s
      where s.id = paper_set_id and public.can_access_paper(s.paper_id)
    )
  )
  with check (
    exists (
      select 1 from public.paper_sets s
      where s.id = paper_set_id and public.can_access_paper(s.paper_id)
    )
  );

-- ---------------------------------------------------------------------------
-- institution settings — readable, admin-writable
-- ---------------------------------------------------------------------------
drop policy if exists "institution_select" on public.institution_settings;
create policy "institution_select"
  on public.institution_settings for select to authenticated
  using (true);

drop policy if exists "institution_update" on public.institution_settings;
create policy "institution_update"
  on public.institution_settings for update to authenticated
  using (public.can_manage_bank())
  with check (public.can_manage_bank());

drop policy if exists "institution_insert" on public.institution_settings;
create policy "institution_insert"
  on public.institution_settings for insert to authenticated
  with check (public.can_manage_bank());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
