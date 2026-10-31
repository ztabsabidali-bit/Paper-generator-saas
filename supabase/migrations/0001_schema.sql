-- =============================================================================
-- 0001_schema.sql — core schema for the Paper Generator SaaS
-- Run order: 0001_schema.sql → 0002_rls.sql → 0003_seed.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.user_role as enum ('super_admin', 'admin', 'teacher');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.question_type as enum ('mcq', 'short', 'long');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.medium_type as enum ('english', 'urdu', 'bilingual');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.difficulty_level as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.text_direction as enum ('ltr', 'rtl');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users — mirrors auth.users, owns the role used for RBAC
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.user_role not null default 'teacher',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Mirror every new Supabase auth user into public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'teacher'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Roles and activation can only be flipped by a super admin (service role bypasses).
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role calls (server actions provisioning users) have no auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role
     and coalesce(public.auth_role(), 'teacher') <> 'super_admin' then
    raise exception 'Only a super admin can change a user role';
  end if;

  if new.is_active is distinct from old.is_active
     and coalesce(public.auth_role(), 'teacher') <> 'super_admin' then
    raise exception 'Only a super admin can change a user status';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_privileges on public.users;
create trigger users_guard_privileges
  before update on public.users
  for each row execute function public.guard_user_privileges();

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id            uuid primary key default gen_random_uuid(),
  class_name    text not null,
  subject_name  text not null,
  created_at    timestamptz not null default now(),
  constraint subjects_class_subject_key unique (class_name, subject_name)
);

-- ---------------------------------------------------------------------------
-- topics — one row per chapter/topic/sub-topic
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references public.subjects (id) on delete cascade,
  chapter_title   text not null,
  topic_title     text,
  subtopic_title  text,
  chapter_order   integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists topics_subject_id_idx on public.topics (subject_id);

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id               uuid primary key default gen_random_uuid(),
  topic_id         uuid not null references public.topics (id) on delete cascade,
  question_type    public.question_type not null,
  question_text    text not null,
  options          jsonb,
  correct_answer   text,
  medium           public.medium_type not null default 'english',
  difficulty       public.difficulty_level not null default 'medium',
  marks            numeric(5, 2) not null default 1 check (marks > 0),
  text_direction   public.text_direction not null default 'ltr',
  explanation      text,
  created_by       uuid default auth.uid() references public.users (id) on delete set null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint questions_mcq_options_check check (
    question_type <> 'mcq'
    or (options is not null and jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2)
  )
);

create index if not exists questions_topic_id_idx on public.questions (topic_id);
create index if not exists questions_type_difficulty_idx
  on public.questions (question_type, difficulty);
create index if not exists questions_created_by_idx on public.questions (created_by);

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- papers — one exam, possibly delivered as several variants (sets)
-- ---------------------------------------------------------------------------
create table if not exists public.papers (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  total_marks       numeric(6, 2) not null default 0,
  created_by        uuid default auth.uid() references public.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  class_name        text not null default '',
  subject_id        uuid references public.subjects (id) on delete set null,
  instructions      text,
  duration_minutes  integer not null default 120,
  exam_session      text,
  seed              bigint not null default 0,
  status            text not null default 'draft'
                    check (status in ('draft', 'final'))
);

create index if not exists papers_created_by_idx on public.papers (created_by);
create index if not exists papers_created_at_idx on public.papers (created_at desc);

drop trigger if exists papers_set_updated_at on public.papers;
create trigger papers_set_updated_at
  before update on public.papers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- paper_sets — Set A / Set B variants of one paper
-- ---------------------------------------------------------------------------
create table if not exists public.paper_sets (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references public.papers (id) on delete cascade,
  set_label   text not null,
  seed        bigint not null default 0,
  created_at  timestamptz not null default now(),
  constraint paper_sets_paper_label_key unique (paper_id, set_label)
);

create index if not exists paper_sets_paper_id_idx on public.paper_sets (paper_id);

-- ---------------------------------------------------------------------------
-- paper_questions — ordered questions inside a specific set
-- ---------------------------------------------------------------------------
create table if not exists public.paper_questions (
  id              uuid primary key default gen_random_uuid(),
  paper_set_id    uuid not null references public.paper_sets (id) on delete cascade,
  question_id     uuid not null references public.questions (id) on delete restrict,
  display_order   integer not null,
  section         text,
  marks_override  numeric(5, 2),
  option_order    jsonb,
  constraint paper_questions_set_order_key unique (paper_set_id, display_order)
);

create index if not exists paper_questions_set_id_idx on public.paper_questions (paper_set_id);
create index if not exists paper_questions_question_id_idx on public.paper_questions (question_id);

-- ---------------------------------------------------------------------------
-- institution_settings — single row, drives the print header
-- ---------------------------------------------------------------------------
create table if not exists public.institution_settings (
  id            boolean primary key default true check (id),
  name          text not null default 'Your Institution',
  tagline       text,
  address       text,
  logo_url      text,
  exam_session  text,
  footer_note   text,
  updated_by    uuid references public.users (id) on delete set null,
  updated_at    timestamptz not null default now()
);

create or replace function public.set_updated_at_institution()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists institution_settings_set_updated_at on public.institution_settings;
create trigger institution_settings_set_updated_at
  before update on public.institution_settings
  for each row execute function public.set_updated_at_institution();
