-- Replaces road_surfaces_batch_insert. Inserts raw linestrings; buffering
-- happens at query time in get_parcels_in_view.
drop function if exists road_surfaces_batch_insert(jsonb[]);

create or replace function road_links_batch_insert(
  p_features jsonb[]
)
returns integer
language plpgsql
security definer
as $$
declare
  total integer := 0;
  feat jsonb;
  geom geometry;
  classification text;
  buffer_m float;
begin
  foreach feat in array p_features loop
    if (feat->>'fictitious')::boolean then continue; end if;

    geom := st_geomfromgeojson(feat->>'geometry');
    if geom is null or st_isempty(geom) then continue; end if;

    classification := feat->>'roadClassification';
    buffer_m := case
      when classification = 'Motorway'   then 15.0
      when classification = 'A Road'     then 10.0
      when classification = 'B Road'     then  7.0
      when classification = 'Minor Road' then  5.0
      else                                     4.0
    end;

    insert into road_links(geometry, buffer_m)
    values (st_setsrid(geom, 4326), buffer_m);
    total := total + 1;
  end loop;
  return total;
end;
$$;
