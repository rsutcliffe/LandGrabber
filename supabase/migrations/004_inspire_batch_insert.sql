-- RPC called by load-postgis.ts to bulk-insert INSPIRE features.
-- Accepts geometry as GeoJSON (jsonb) so ST_GeomFromGeoJSON can be used directly,
-- avoiding the EWKT/WKT format that the PostgREST table insert path requires.
--
-- ST_SimplifyPreserveTopology at 0.00001° (~1m) reduces storage 60-80% vs raw
-- INSPIRE while retaining full visual accuracy at web map zoom levels.
-- ST_Simplify is NOT used here because it can collapse small polygons to lines/points,
-- causing NULL casts to MultiPolygon; PreserveTopology guarantees output type matches input.
create or replace function inspire_batch_insert(
  p_la_code    text,
  p_data_month date,
  p_features   jsonb      -- array of {inspire_id, geometry (GeoJSON object)}
) returns int
language plpgsql
security definer
as $$
declare
  inserted int := 0;
begin
  with simplified as (
    select
      (f->>'inspire_id')::bigint as inspire_id,
      st_multi(
        st_makevalid(
          st_simplifypreservetopology(
            st_geomfromgeojson(f->'geometry'),
            0.00001
          )
        )
      ) as geom
    from jsonb_array_elements(p_features) f
    where f->'geometry' is not null
      and f->>'inspire_id' is not null
  )
  insert into registered_land (inspire_id, local_authority_code, geometry, data_month)
  select inspire_id, p_la_code, geom, p_data_month
  from simplified
  where geom is not null
    and not st_isempty(geom);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
