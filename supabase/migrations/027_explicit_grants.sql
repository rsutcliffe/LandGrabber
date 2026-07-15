-- Explicit grants required ahead of Supabase's October 30 2026 enforcement:
-- new tables in public schema will no longer be auto-granted to anon/authenticated.
-- Only tables accessed directly via the Data API need grants here; tables accessed
-- exclusively via SECURITY DEFINER RPCs (road_links, greenspace_sites, etc.) do not.

grant select on public.registered_land to anon, authenticated;
grant select on public.common_land     to anon, authenticated;

grant select, insert, update, delete
  on public.saved_parcels to authenticated;
