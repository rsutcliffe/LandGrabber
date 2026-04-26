create table water_links (
  id uuid primary key default gen_random_uuid(),
  form text,
  name text,
  geometry geometry(geometry, 4326) not null,
  buffer_m float not null default 8,
  created_at timestamptz default now()
);

create index water_links_geometry_idx on water_links using gist(geometry);
