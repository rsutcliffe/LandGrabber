-- RPC function: returns land parcels intersecting a viewport bounding box.
-- Called by GET /api/parcels via supabase.rpc('get_parcels_in_view', ...)
--
-- Unregistered land is computed dynamically (ST_Difference of viewport minus
-- registered parcels) rather than pre-computed. This avoids needing the
-- england_boundary table and works correctly with partial regional data loads.
-- With the GIST index and max-0.06° viewport constraint this runs in <5s.
-- SECURITY DEFINER with set local statement_timeout = '15s' overrides the
-- default 3s anon role timeout for this compute-heavy spatial query.
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
language plpgsql
volatile
security definer
as $$
#variable_conflict use_column
begin
  set local statement_timeout = '15s';

  return query
  select
    gen_random_uuid() as id,
    'unregistered'::text as land_type,
    st_area(gap.geom::geography) as area_sqm,
    'medium'::text as confidence,
    latest.data_month,
    st_asgeojson(gap.geom)::json as geometry
  from (
    select max(data_month) as data_month from registered_land
  ) latest,
  lateral (
    select (st_dump(
      st_difference(
        st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326),
        st_union(rl.geometry)
      )
    )).geom
    from registered_land rl
    where st_intersects(rl.geometry, st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326))
      and rl.data_month = latest.data_month
    having count(*) > 0
  ) gap
  where 'unregistered' = any(p_types)
    and not st_isempty(gap.geom)
    and st_area(gap.geom::geography) > 25

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
end;
$$;
