import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ParcelPanel from '@/components/map/ParcelPanel'
import type { SelectedParcel } from '@/components/map/MapView'

const mockFetch = jest.fn()
global.fetch = mockFetch

const unregisteredParcel: SelectedParcel = {
  id: 'parcel-001',
  properties: {
    land_type: 'unregistered',
    area_sqm: 1500,
    confidence: 'medium',
    data_month: '2024-01-01',
  },
}

const commonParcel: SelectedParcel = {
  id: 'parcel-002',
  properties: {
    land_type: 'common',
    area_sqm: 25000,
    confidence: null,
    data_month: '2024-06-01',
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ saved: false }) })
})

describe('ParcelPanel', () => {
  it('renders nothing when parcel is null', () => {
    const { container } = render(<ParcelPanel parcel={null} onClose={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows unregistered label with correct badge', async () => {
    render(<ParcelPanel parcel={unregisteredParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByText('No registered title'))
    expect(screen.getByText('No registered title')).toBeInTheDocument()
  })

  it('shows common land label with correct badge', async () => {
    render(<ParcelPanel parcel={commonParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByText('Registered common land'))
    expect(screen.getByText('Registered common land')).toBeInTheDocument()
  })

  it('formats area in m² for small parcels', async () => {
    render(<ParcelPanel parcel={unregisteredParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByText('1,500 m²'))
  })

  it('formats area in ha for large parcels', async () => {
    render(<ParcelPanel parcel={commonParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByText('2.50 ha'))
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    render(<ParcelPanel parcel={unregisteredParcel} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /close panel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows advisory notice for unregistered parcels', async () => {
    render(<ParcelPanel parcel={unregisteredParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByText(/not guaranteed to be acquirable/i))
  })

  it('shows common land notice for common parcels', async () => {
    render(<ParcelPanel parcel={commonParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByText(/public access rights but is owned/i))
  })

  it('fetches save state on mount and enables save button', async () => {
    render(<ParcelPanel parcel={unregisteredParcel} onClose={jest.fn()} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/parcel/parcel-001'))
    await waitFor(() => screen.getByRole('button', { name: /save parcel/i }))
  })

  it('shows saved state when parcel is already saved', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ saved: true }) })
    render(<ParcelPanel parcel={unregisteredParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByRole('button', { name: /saved — click to remove/i }))
  })

  it('toggles to saved when save button is clicked', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ saved: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(<ParcelPanel parcel={unregisteredParcel} onClose={jest.fn()} />)
    await waitFor(() => screen.getByRole('button', { name: /save parcel/i }))
    await user.click(screen.getByRole('button', { name: /save parcel/i }))

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/parcel/parcel-001',
      expect.objectContaining({ method: 'POST' }),
    )
    await waitFor(() => screen.getByRole('button', { name: /saved — click to remove/i }))
  })
})
