create table bona_vacantia (
  id uuid primary key default gen_random_uuid(),
  bvd_ref text,
  title text,
  geometry geometry(multipolygon, 4326) not null,
  area_sqm float generated always as (st_area(geometry::geography)) stored,
  data_year integer not null,
  created_at timestamptz default now()
);

create index bona_vacantia_geometry_idx on bona_vacantia using gist(geometry);

-- public read (same pattern as common_land in migration 006)
alter table bona_vacantia enable row level security;
create policy "Public read bona_vacantia"
  on bona_vacantia for select using (true);
