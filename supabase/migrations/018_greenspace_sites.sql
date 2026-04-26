create table greenspace_sites (
  id uuid primary key default gen_random_uuid(),
  os_id text,
  function text,
  name text,
  geometry geometry(multipolygon, 4326) not null,
  area_sqm float generated always as (st_area(geometry::geography)) stored,
  created_at timestamptz default now()
);

create index greenspace_sites_geometry_idx on greenspace_sites using gist(geometry);
