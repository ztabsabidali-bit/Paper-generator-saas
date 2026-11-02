-- =============================================================================
-- 0005_drop_legacy.sql — retire the pre-tenancy institution singleton
--
-- 0004 moved branding into public.institutions and the new Worker build is
-- live, so nothing reads institution_settings any more.
-- =============================================================================

drop table if exists public.institution_settings;
drop function if exists public.set_updated_at_institution();
