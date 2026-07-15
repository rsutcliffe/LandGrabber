-- Pin search_path on user-defined SECURITY DEFINER / app functions to
-- prevent search-path hijacking, and revoke EXECUTE on ingest RPCs from
-- public roles (only service_role calls them).

alter function public.road_links_compute_buffer()      set search_path = public, pg_temp;
alter function public.water_links_compute_buffer()     set search_path = public, pg_temp;
alter function public.inspire_batch_insert(text, date, jsonb)
                                                       set search_path = public, pg_temp;
alter function public.road_links_batch_insert(jsonb[]) set search_path = public, pg_temp;
alter function public.get_parcel_context(double precision, double precision)
                                                       set search_path = public, pg_temp;
alter function public.get_parcels_in_view(double precision, double precision, double precision, double precision, text[])
                                                       set search_path = public, pg_temp;

revoke execute on function public.inspire_batch_insert(text, date, jsonb) from anon, authenticated, public;
revoke execute on function public.road_links_batch_insert(jsonb[])        from anon, authenticated, public;
revoke execute on function public.rls_auto_enable()                       from anon, authenticated, public;
