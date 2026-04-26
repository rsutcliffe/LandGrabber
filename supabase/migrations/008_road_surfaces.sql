create table road_surfaces (
  id uuid primary key default gen_random_uuid(),
  geometry geometry(polygon, 4326) not null
);

create index road_surfaces_geometry_idx on road_surfaces using gist(geometry);
