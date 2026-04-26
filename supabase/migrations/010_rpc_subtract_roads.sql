-- Replaces 003_rpc_get_parcels_in_view.sql.
-- Adds road subtraction (ST_Difference against road_surfaces) and a
-- Polsby-Popper compactness filter (> 0.02) to drop remaining road slivers.
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
declare
  v_envelope geometry := st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);
  v_road_mask geometry;
begin
  set local statement_timeout = '15s';

  -- build road mask once for this viewport (empty geometry if no roads loaded)
  select coalesce(
    st_union(rs.geometry),
    st_geomfromtext('GEOMETRYCOLLECTION EMPTY', 4326)
  )
  into v_road_mask
  from road_surfaces rs
  where st_intersects(rs.geometry, v_envelope);

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
        st_difference(
          v_envelope,
          st_union(rl.geometry)
        ),
        v_road_mask
      )
    )).geom
    from registered_land rl
    where st_intersects(rl.geometry, v_envelope)
      and rl.data_month = latest.data_month
    having count(*) > 0
  ) gap
  where 'unregistered' = any(p_types)
    and not st_isempty(gap.geom)
    and st_area(gap.geom::geography) > 25
    and 4*pi()*st_area(gap.geom) / nullif(st_perimeter(gap.geom)^2, 0) > 0.02

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
    and st_intersects(cl.geometry, v_envelope);
end;
$$;
