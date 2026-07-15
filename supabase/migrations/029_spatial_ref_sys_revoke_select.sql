-- spatial_ref_sys is a PostGIS system table OWNED BY supabase_admin, and its grants to
-- anon/authenticated were also made BY supabase_admin.
--
-- IMPORTANT: On Supabase HOSTED, the role available to migrations/MCP/dashboard is `postgres`,
-- which is NOT a superuser and NOT a member of supabase_admin. Postgres can neither ENABLE RLS
-- (requires table ownership) nor REVOKE these grants (requires being the owner/grantor). So on
-- hosted, the statements below are SILENT NO-OPS — verified 2026-06-18: anon still has full
-- arwdDxtm after running them. (Migration 026's write-revoke was a no-op for the same reason.)
--
-- They DO take effect on a LOCAL `supabase db reset` (postgres is superuser there), so we keep
-- them to harden local/CI. To genuinely close anon read+write on the HOSTED project, the grant
-- must be revoked by supabase_admin — raise a Supabase support ticket, or move PostGIS to the
-- `extensions` schema. Until then, acknowledge lint 0013 in the dashboard Advisors view.

revoke all on public.spatial_ref_sys from anon, authenticated;
revoke all on public.spatial_ref_sys from public;
