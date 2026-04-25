-- INSPIRE IDs are scoped per local authority, not globally unique.
-- Replace the global unique constraint with a composite one.
-- Also add index on local_authority_code to prevent full table scans during
-- the per-LA delete that precedes each batch insert.

alter table registered_land
  drop constraint registered_land_inspire_id_key;

alter table registered_land
  add constraint registered_land_inspire_id_la_key unique (inspire_id, local_authority_code);

create index registered_land_la_month_idx
  on registered_land (local_authority_code, data_month);
