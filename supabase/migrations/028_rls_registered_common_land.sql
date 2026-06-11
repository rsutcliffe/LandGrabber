ALTER TABLE registered_land ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_land ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON registered_land FOR SELECT USING (true);
CREATE POLICY "Public read access" ON common_land FOR SELECT USING (true);
