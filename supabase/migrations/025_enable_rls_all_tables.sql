-- Enable RLS on all tables that currently lack it.
-- All app access goes through SECURITY DEFINER RPCs which bypass RLS,
-- so no permissive policies are needed — these tables are now locked
-- to service_role/admin only for direct access.

alter table public.unregistered_land enable row level security;
alter table public.england_boundary   enable row level security;
alter table public.data_refresh_log   enable row level security;
alter table public.road_links         enable row level security;
alter table public.greenspace_sites   enable row level security;
alter table public.water_links        enable row level security;
