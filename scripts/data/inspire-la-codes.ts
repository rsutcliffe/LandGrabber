/**
 * INSPIRE Local Authority codes for Yorkshire and The Humber.
 * Source: ONS Geography codes. Used to filter HMLR INSPIRE downloads for PoC.
 * Expand to all ~330 entries for national run.
 */
export const YORKSHIRE_LA_CODES: Record<string, string> = {
  E08000016: 'Barnsley',
  E07000163: 'Bradford',
  E07000165: 'Calderdale',
  E08000017: 'Doncaster',
  E06000011: 'East Riding of Yorkshire',
  E06000010: 'Kingston upon Hull',
  E07000166: 'Kirklees',
  E07000167: 'Leeds',
  E10000023: 'North Yorkshire',
  E08000018: 'Rotherham',
  E06000014: 'York',
  E08000019: 'Sheffield',
  E07000168: 'Wakefield',
}

// Full national list stub — populate for production run
export const ALL_LA_CODES: Record<string, string> = {
  ...YORKSHIRE_LA_CODES,
  // Add remaining ~317 LAs here for national run
}
