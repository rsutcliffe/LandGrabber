-- Pre-compute buffered road geometry so get_parcels_in_view avoids
-- per-row ST_Transform + ST_Buffer at query time.

alter table road_links
  add column if not exists buffered_geom geometry(geometry, 4326);

-- Trigger: compute buffer on every insert / update of geometry or buffer_m
create or replace function road_links_compute_buffer()
returns trigger language plpgsql as $$
begin
  new.buffered_geom :=
    st_transform(st_buffer(st_transform(new.geometry, 27700), new.buffer_m), 4326);
  return new;
end;
$$;

drop trigger if exists road_links_buffer_trig on road_links;
create trigger road_links_buffer_trig
before insert or update of geometry, buffer_m on road_links
for each row execute function road_links_compute_buffer();

-- Index first (even empty), then backfill
create index if not exists road_links_buffered_geom_idx
  on road_links using gist(buffered_geom);

-- Backfill existing rows
set local statement_timeout = '600s';
update road_links
set buffered_geom =
  st_transform(st_buffer(st_transform(geometry, 27700), buffer_m), 4326)
where buffered_geom is null;
