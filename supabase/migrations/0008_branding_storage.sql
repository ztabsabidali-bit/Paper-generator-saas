-- Public bucket for institution logos uploaded from /settings.
--
-- The app writes to it with the service role (src/actions/institution.ts), so
-- no storage.objects INSERT policy is needed for browser clients. Making the
-- bucket public gives the printed header a stable, cacheable URL.
--
-- Apply this once per project: Supabase Dashboard → SQL Editor, or
-- `npx supabase db push`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
