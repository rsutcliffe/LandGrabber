-- spatial_ref_sys is owned by the PostGIS extension; ALTER TABLE ENABLE ROW LEVEL SECURITY
-- requires table ownership and fails in Supabase's hosted environment.
-- Revoke write access from API roles as the best available mitigation.
-- SELECT is intentionally left intact — the data is public coordinate reference info.

revoke insert, update, delete on public.spatial_ref_sys from anon, authenticated;
