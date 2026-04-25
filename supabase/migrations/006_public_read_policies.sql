-- registered_land and common_land are public open data — readable by anyone.
-- RLS is enabled (Supabase default) so explicit policies are required.

create policy "Public read registered_land"
  on registered_land for select
  to anon, authenticated
  using (true);

create policy "Public read common_land"
  on common_land for select
  to anon, authenticated
  using (true);
