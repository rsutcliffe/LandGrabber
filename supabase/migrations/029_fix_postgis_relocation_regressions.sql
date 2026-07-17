-- Supabase support moved the postgis extension from public to extensions
-- (fixes the spatial_ref_sys RLS advisor warning + extension_in_public warning).
-- These SECURITY DEFINER functions hardcode search_path without "extensions",
-- so postgis types/functions (geography, ST_*) stopped resolving. Add it back.
alter function public.get_parcel_context(double precision, double precision) set search_path = public, extensions, pg_temp;
alter function public.get_parcels_in_view(double precision, double precision, double precision, double precision, text[]) set search_path = public, extensions, pg_temp;
alter function public.inspire_batch_insert(text, date, jsonb) set search_path = public, extensions, pg_temp;
alter function public.road_links_batch_insert(jsonb[]) set search_path = public, extensions, pg_temp;
alter function public.road_links_compute_buffer() set search_path = public, extensions, pg_temp;
alter function public.water_links_compute_buffer() set search_path = public, extensions, pg_temp;

-- get_parcel_context was declared stable but calls "set local statement_timeout",
-- which Postgres 17 rejects in a non-volatile function. Never actually callable.
alter function public.get_parcel_context(double precision, double precision) volatile;
