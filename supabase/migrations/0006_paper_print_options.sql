-- =============================================================================
-- 0006_paper_print_options.sql — choose which details appear on the printed paper
--
-- The builder stores one boolean per printed detail. An empty object means
-- "print everything", so papers created before this migration keep working
-- without a backfill.
-- =============================================================================

alter table public.papers
  add column if not exists print_options jsonb not null default '{}'::jsonb;

comment on column public.papers.print_options is
  'Printed details for this paper: title, session, duration, set_label, instructions. Missing keys default to true.';
