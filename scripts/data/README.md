# Data Pipeline

Scripts that populate the PostGIS database from open government data sources.
Run manually at PoC stage. Designed for monthly automation in production.

## Prerequisites

1. **GDAL** — required for GML→GeoJSON conversion:
   ```bash
   brew install gdal
   ```

2. **HMLR account** — required to download INSPIRE data:
   - Register at https://use-land-property-data.service.gov.uk
   - Agree to the INSPIRE licence
   - Add your API key to `.env.local` as `HMLR_API_KEY`

3. **Supabase credentials** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS — pipeline only)

---

## First-time setup (run once)

Load the England boundary polygon (used by gap computation):
```bash
npm run pipeline:england-boundary
```

Load Natural England common land dataset (updated annually):
```bash
npm run pipeline:common-land
```

---

## INSPIRE pipeline (monthly)

### PoC — Yorkshire only
```bash
npm run pipeline:yorkshire
```

### National run
```bash
npm run pipeline -- --region all
```

### Skip re-downloading if zips already present
```bash
npm run pipeline:yorkshire -- --skip-download
```

---

## Individual scripts

| Script | Purpose |
|---|---|
| `download-inspire.ts` | Download GML zips from HMLR per local authority |
| `convert-gml.ts` | Convert GML → GeoJSON, reproject EPSG:27700 → 4326 |
| `load-postgis.ts` | Bulk insert GeoJSON into `registered_land` table |
| `compute-gaps.ts` | ST_Difference to populate `unregistered_land` |
| `load-england-boundary.ts` | Load England boundary from ONS (one-time) |
| `load-common-land.ts` | Load Natural England common land (annual) |
| `update-refresh-log.ts` | Record pipeline run in `data_refresh_log` |
| `run-pipeline.ts` | Orchestrates all steps above |

---

## Temp directory structure

```
tmp/
  inspire/
    zips/         ← downloaded GML zip files
    gml/          ← extracted GML files
    geojson/      ← converted GeoJSON files
  england_boundary.geojson
  england_boundary_valid.geojson
```

The `tmp/` directory is gitignored. It can be deleted between runs.

---

## Data licences

- **INSPIRE polygons**: Open Government Licence v3.0  
  Attribution: "Information sourced from HM Land Registry © Crown copyright. OS data © Crown copyright and database right [year]."

- **Common land**: Open Government Licence v3.0  
  Attribution: "© Natural England copyright. Contains Ordnance Survey data © Crown copyright and database right [year]."

- **England boundary**: Open Government Licence v3.0 (ONS)
