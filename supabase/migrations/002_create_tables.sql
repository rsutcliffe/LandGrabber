-- registered_land: INSPIRE Index Polygon data for freehold registered land
create table registered_land (
  id uuid primary key default gen_random_uuid(),
  inspire_id bigint not null unique,
  local_authority_code text,
  geometry geometry(multipolygon, 4326) not null,
  area_sqm float generated always as (st_area(geometry::geography)) stored,
  data_month date not null,
  created_at timestamptz default now()
);

create index registered_land_geometry_idx on registered_land using gist(geometry);
create index registered_land_inspire_id_idx on registered_land(inspire_id);

-- unregistered_land: pre-computed gap polygons (ST_Difference of England boundary minus registered_land)
create table unregistered_land (
  id uuid primary key default gen_random_uuid(),
  geometry geometry(multipolygon, 4326) not null,
  area_sqm float generated always as (st_area(geometry::geography)) stored,
  data_month date not null,
  confidence text not null default 'medium',
  created_at timestamptz default now()
);

create index unregistered_land_geometry_idx on unregistered_land using gist(geometry);

-- common_land: Natural England registered common land
create table common_land (
  id uuid primary key default gen_random_uuid(),
  commons_ref text,
  name text,
  commons_act_registration text,
  geometry geometry(multipolygon, 4326) not null,
  area_sqm float generated always as (st_area(geometry::geography)) stored,
  data_year integer not null,
  created_at timestamptz default now()
);

create index common_land_geometry_idx on common_land using gist(geometry);

-- england_boundary: single polygon used by data pipeline for gap computation
create table england_boundary (
  id uuid primary key default gen_random_uuid(),
  geometry geometry(multipolygon, 4326) not null,
  created_at timestamptz default now()
);

-- saved_parcels: user-saved land parcels (RLS enforced)
create table saved_parcels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parcel_id text not null,
  land_type text not null check (land_type in ('unregistered', 'registered', 'common', 'bona_vacantia', 'village_green')),
  area_sqm float,
  centroid geometry(point, 4326),
  user_note text check (char_length(user_note) <= 500),
  saved_at timestamptz default now()
);

alter table saved_parcels enable row level security;

create policy "Users can manage their own saved parcels"
  on saved_parcels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- data_refresh_log: pipeline run history
create table data_refresh_log (
  id uuid primary key default gen_random_uuid(),
  layer_name text not null,
  data_period text,
  refreshed_at timestamptz default now(),
  record_count integer,
  notes text
);
