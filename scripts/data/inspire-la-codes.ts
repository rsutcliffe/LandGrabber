/**
 * Maps ONS LA codes to HMLR INSPIRE download filenames.
 * URL pattern: BASE_URL/{filename}?key={HMLR_API_KEY}
 * Filenames sourced from: /datasets/inspire/download (HMLR service index page).
 */

export interface LaEntry {
  code: string
  name: string
  hmlrFile: string
}

export const YORKSHIRE_LAS: LaEntry[] = [
  { code: 'E08000016', name: 'Barnsley',               hmlrFile: 'Barnsley_Metropolitan_Borough_Council.zip' },
  { code: 'E07000163', name: 'Bradford',               hmlrFile: 'City_of_Bradford_Metropolitan_District_Council.zip' },
  { code: 'E07000165', name: 'Calderdale',             hmlrFile: 'Calderdale_Metropolitan_Borough_Council.zip' },
  { code: 'E08000017', name: 'Doncaster',              hmlrFile: 'Doncaster_Metropolitan_Borough_Council.zip' },
  { code: 'E06000011', name: 'East Riding of Yorkshire', hmlrFile: 'East_Riding_of_Yorkshire_Council.zip' },
  { code: 'E06000010', name: 'Kingston upon Hull',     hmlrFile: 'Hull_City_Council.zip' },
  { code: 'E07000166', name: 'Kirklees',               hmlrFile: 'Kirklees_Council.zip' },
  { code: 'E07000167', name: 'Leeds',                  hmlrFile: 'Leeds_City_Council.zip' },
  { code: 'E10000023', name: 'North Yorkshire',        hmlrFile: 'The_North_Yorkshire_Council.zip' },
  { code: 'E08000018', name: 'Rotherham',              hmlrFile: 'Rotherham_Metropolitan_Borough_Council.zip' },
  { code: 'E08000019', name: 'Sheffield',              hmlrFile: 'Sheffield_City_Council.zip' },
  { code: 'E07000168', name: 'Wakefield',              hmlrFile: 'Wakefield_Metropolitan_District_Council.zip' },
  { code: 'E06000014', name: 'York',                   hmlrFile: 'City_of_York_Council.zip' },
]

// Full national list — expand for production run by scraping the HMLR download index page
export const ALL_LAS: LaEntry[] = [
  ...YORKSHIRE_LAS,
  // Add remaining ~317 LAs here
]
