-- Enforce one save per user per parcel, enabling upsert in the API
alter table saved_parcels
  add constraint saved_parcels_user_parcel_unique unique (user_id, parcel_id);
