create table village_green (
  id uuid primary key default gen_random_uuid(),
  registration_ref text,
  name text,
  geometry geometry(multipolygon, 4326) not null,
  area_sqm float generated always as (st_area(geometry::geography)) stored,
  data_year integer not null,
  created_at timestamptz default now()
);

create index village_green_geometry_idx on village_green using gist(geometry);

alter table village_green enable row level security;

create policy "Public read village_green"
  on village_green for select using (true);
