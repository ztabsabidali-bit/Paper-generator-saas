-- =============================================================================
-- 0007_paper_blueprints.sql — reusable paper blueprints
--
-- A blueprint is the recipe for auto-filling a paper: the subject, the chosen
-- chapters, the per-type counts/marks/difficulty, how many variants to draw,
-- whether to shuffle options, and the duration. Papers still store their own
-- copy of everything, so editing a blueprint never changes an existing paper.
--
-- Blueprints are scoped to one institution. Every teacher in the institution
-- can load them; only the author (or an institution admin) can change or
-- delete one. Run this after 0006 in the Supabase SQL editor.
-- =============================================================================

create table if not exists public.paper_blueprints (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions (id) on delete cascade,
  created_by        uuid default auth.uid() references public.users (id) on delete set null,
  name              text not null check (length(btrim(name)) between 1 and 80),
  subject_id        uuid not null references public.subjects (id) on delete cascade,
  topic_ids         uuid[] not null default '{}',
  blueprint         jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(blueprint) = 'array'),
  set_count         integer not null default 2 check (set_count between 1 and 4),
  shuffle_options   boolean not null default true,
  duration_minutes  integer not null default 120
                    check (duration_minutes between 15 and 300),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint paper_blueprints_institution_name_key unique (institution_id, name)
);

create index if not exists paper_blueprints_institution_id_idx
  on public.paper_blueprints (institution_id);
create index if not exists paper_blueprints_subject_id_idx
  on public.paper_blueprints (subject_id);
create index if not exists paper_blueprints_created_by_idx
  on public.paper_blueprints (created_by);

drop trigger if exists paper_blueprints_set_updated_at on public.paper_blueprints;
create trigger paper_blueprints_set_updated_at
  before update on public.paper_blueprints
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.paper_blueprints enable row level security;

drop policy if exists "paper_blueprints_select" on public.paper_blueprints;
create policy "paper_blueprints_select"
  on public.paper_blueprints for select to authenticated
  using (public.same_institution(institution_id));

drop policy if exists "paper_blueprints_insert" on public.paper_blueprints;
create policy "paper_blueprints_insert"
  on public.paper_blueprints for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and institution_id = public.auth_institution_id()
    and public.subject_institution(subject_id) = institution_id
  );

drop policy if exists "paper_blueprints_update" on public.paper_blueprints;
create policy "paper_blueprints_update"
  on public.paper_blueprints for update to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  )
  with check (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
    and public.subject_institution(subject_id) = institution_id
  );

drop policy if exists "paper_blueprints_delete" on public.paper_blueprints;
create policy "paper_blueprints_delete"
  on public.paper_blueprints for delete to authenticated
  using (
    public.same_institution(institution_id)
    and (created_by = (select auth.uid()) or public.can_manage_bank())
  );
