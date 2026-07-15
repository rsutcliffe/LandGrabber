export const PARCEL_TYPES = {
  unregistered: {
    label: 'No registered title',
    fill: '#16a34a',
    outline: '#15803d',
    fillOpacity: 0.35,
  },
  common: {
    label: 'Registered common land',
    fill: '#2563eb',
    outline: '#1d4ed8',
    fillOpacity: 0.4,
  },
  bona_vacantia: {
    label: 'Crown ownerless property',
    fill: '#d97706',
    outline: '#b45309',
    fillOpacity: 0.4,
  },
  village_green: {
    label: 'Town or village green',
    fill: '#7c3aed',
    outline: '#6d28d9',
    fillOpacity: 0.4,
  },
} as const

export type ParcelTypeKey = keyof typeof PARCEL_TYPES
