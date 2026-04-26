-- Pre-compute buffered water geometry (same pattern as road_links).

alter table water_links
  add column if not exists buffered_geom geometry(geometry, 4326);

create or replace function water_links_compute_buffer()
returns trigger language plpgsql as $$
begin
  new.buffered_geom :=
    st_transform(st_buffer(st_transform(new.geometry, 27700), new.buffer_m), 4326);
  return new;
end;
$$;

drop trigger if exists water_links_buffer_trig on water_links;
create trigger water_links_buffer_trig
before insert or update of geometry, buffer_m on water_links
for each row execute function water_links_compute_buffer();

create index if not exists water_links_buffered_geom_idx
  on water_links using gist(buffered_geom);

-- ~19k rows — fast
update water_links
set buffered_geom =
  st_transform(st_buffer(st_transform(geometry, 27700), buffer_m), 4326)
where buffered_geom is null;
