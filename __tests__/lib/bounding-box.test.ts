/**
 * @jest-environment node
 */
import {
  validateBoundingBox,
  BoundingBoxError,
} from '@/lib/validation/bounding-box'

describe('validateBoundingBox', () => {
  const validBox = { min_lat: 53.7, min_lng: -1.6, max_lat: 53.8, max_lng: -1.5 }

  it('returns parsed floats for a valid England bounding box', () => {
    const result = validateBoundingBox(validBox)
    expect(result).toEqual(validBox)
  })

  it('throws BoundingBoxError when min_lat is outside England (too far south)', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, min_lat: 49.0 })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when max_lat is outside England (too far north)', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, max_lat: 56.0 })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when lng is outside England (too far west)', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, min_lng: -7.0 })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when lng is outside England (too far east)', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, max_lng: 3.0 })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when bounding box area exceeds ~10km x 10km', () => {
    // ~1 degree lat ≈ 111km — far exceeds the limit
    expect(() =>
      validateBoundingBox({ min_lat: 51.0, min_lng: -1.0, max_lat: 52.0, max_lng: 0.0 })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when a required param is missing', () => {
    const { min_lat, ...missing } = validBox
    expect(() => validateBoundingBox(missing as never)).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when a value is not a finite number', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, min_lat: NaN })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when min_lat >= max_lat', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, min_lat: 53.8, max_lat: 53.7 })
    ).toThrow(BoundingBoxError)
  })

  it('throws BoundingBoxError when min_lng >= max_lng', () => {
    expect(() =>
      validateBoundingBox({ ...validBox, min_lng: -1.5, max_lng: -1.6 })
    ).toThrow(BoundingBoxError)
  })
})
