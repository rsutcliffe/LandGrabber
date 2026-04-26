-- Replaces 015_rpc_add_bona_vacantia.sql. Adds village_green union.
create or replace function get_parcels_in_view(
  p_min_lat float,
  p_min_lng float,
  p_max_lat float,
  p_max_lng float,
  p_types text[] default array['unregistered', 'common', 'bona_vacantia', 'village_green']
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

  select coalesce(
    st_union(
      st_transform(
        st_buffer(st_transform(rl.geometry, 27700), rl.buffer_m),
        4326
      )
    ),
    st_geomfromtext('GEOMETRYCOLLECTION EMPTY', 4326)
  )
  into v_road_mask
  from road_links rl
  where st_intersects(rl.geometry, v_envelope);

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
    and st_intersects(cl.geometry, v_envelope)

  union all

  select
    bv.id,
    'bona_vacantia'::text as land_type,
    bv.area_sqm,
    'medium'::text as confidence,
    make_date(bv.data_year, 1, 1) as data_month,
    st_asgeojson(bv.geometry)::json as geometry
  from bona_vacantia bv
  where 'bona_vacantia' = any(p_types)
    and st_intersects(bv.geometry, v_envelope)

  union all

  select
    vg.id,
    'village_green'::text as land_type,
    vg.area_sqm,
    'high'::text as confidence,
    make_date(vg.data_year, 1, 1) as data_month,
    st_asgeojson(vg.geometry)::json as geometry
  from village_green vg
  where 'village_green' = any(p_types)
    and st_intersects(vg.geometry, v_envelope);
end;
$$;
