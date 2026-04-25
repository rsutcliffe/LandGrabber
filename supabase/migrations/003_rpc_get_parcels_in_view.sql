-- RPC function: returns land parcels intersecting a viewport bounding box
-- Called by GET /api/parcels via supabase.rpc('get_parcels_in_view', ...)
create or replace function get_parcels_in_view(
  p_min_lat float,
  p_min_lng float,
  p_max_lat float,
  p_max_lng float,
  p_types text[] default array['unregistered', 'common']
)
returns table (
  id uuid,
  land_type text,
  area_sqm float,
  confidence text,
  data_month date,
  geometry json
)
language sql
stable
as $$
  select
    ul.id,
    'unregistered'::text as land_type,
    ul.area_sqm,
    ul.confidence,
    ul.data_month,
    st_asgeojson(ul.geometry)::json as geometry
  from unregistered_land ul
  where 'unregistered' = any(p_types)
    and st_intersects(
      ul.geometry,
      st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )

  union all

  select
    cl.id,
    'common'::text as land_type,
    cl.area_sqm,
    'high'::text as confidence,
    make_date(cl.data_year, 1, 1) as data_month,
    st_asgeojson(cl.geometry)::json as geometry
  from common_land cl
  where 'common' = any(p_types)
    and st_intersects(
      cl.geometry,
      st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    );
$$;
