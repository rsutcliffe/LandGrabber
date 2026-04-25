export class BoundingBoxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BoundingBoxError'
  }
}

export interface BoundingBox {
  min_lat: number
  min_lng: number
  max_lat: number
  max_lng: number
}

// England extent (with small margin)
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

// Max bounding box: ~0.1 degrees ≈ 11km lat / ~7km lng at England latitudes
// 0.105 avoids rejecting valid 0.1° boxes due to floating-point imprecision
const MAX_DEGREES = 0.105

export function validateBoundingBox(raw: Partial<Record<keyof BoundingBox, number>>): BoundingBox {
  const keys: Array<keyof BoundingBox> = ['min_lat', 'min_lng', 'max_lat', 'max_lng']

  const parsed = {} as BoundingBox
  for (const key of keys) {
    const val = raw[key]
    if (val === undefined || val === null || !isFinite(val)) {
      throw new BoundingBoxError(`Missing or invalid parameter: ${key}`)
    }
    parsed[key] = val
  }

  const { min_lat, min_lng, max_lat, max_lng } = parsed

  if (min_lat >= max_lat) throw new BoundingBoxError('min_lat must be less than max_lat')
  if (min_lng >= max_lng) throw new BoundingBoxError('min_lng must be less than max_lng')

  if (
    min_lat < ENGLAND.minLat || max_lat > ENGLAND.maxLat ||
    min_lng < ENGLAND.minLng || max_lng > ENGLAND.maxLng
  ) {
    throw new BoundingBoxError('Bounding box is outside the England extent')
  }

  if (max_lat - min_lat > MAX_DEGREES || max_lng - min_lng > MAX_DEGREES) {
    throw new BoundingBoxError('Zoom in further to load parcel data')
  }

  return parsed
}

export function parseBoundingBoxFromSearchParams(params: URLSearchParams): BoundingBox {
  const raw: Partial<Record<keyof BoundingBox, number>> = {
    min_lat: parseFloat(params.get('min_lat') ?? ''),
    min_lng: parseFloat(params.get('min_lng') ?? ''),
    max_lat: parseFloat(params.get('max_lat') ?? ''),
    max_lng: parseFloat(params.get('max_lng') ?? ''),
  }
  return validateBoundingBox(raw)
}
