-- Returns the count of registered land titles within 100m of a point
-- and the distance to the nearest one.
-- Used to flag unregistered gaps that are likely curtilage of adjacent titles.
create or replace function get_parcel_context(p_lng float, p_lat float)
returns json
language plpgsql
security definer
as $$
declare
  v_point    geography := st_setsrid(st_point(p_lng, p_lat), 4326)::geography;
  v_count    integer;
  v_nearest  float;
  v_month    date;
begin
  set local statement_timeout = '5s';

  select max(data_month) into v_month from registered_land;

  select
    count(*)::integer,
    min(st_distance(rl.geometry::geography, v_point))
  into v_count, v_nearest
  from registered_land rl
  where rl.data_month = v_month
    and st_dwithin(rl.geometry::geography, v_point, 100);

  return json_build_object(
    'adjacent_registered', coalesce(v_count, 0),
    'nearest_m',           round(coalesce(v_nearest, null)::numeric, 1)
  );
end;
$$;
