-- Replace road_surfaces (buffered polygons, too large) with road_links
-- (raw linestrings + buffer_m). Buffering happens at query time in the RPC,
-- applied only to the ~200-500 segments that intersect each viewport.
drop table if exists road_surfaces;

create table road_links (
  id uuid primary key default gen_random_uuid(),
  geometry geometry(linestring, 4326) not null,
  buffer_m float not null default 6.0
);

create index road_links_geometry_idx on road_links using gist(geometry);
