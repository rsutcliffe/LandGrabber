import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '@/components/map/SearchBar'

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockResult = {
  display_name: 'Leeds, West Yorkshire, England',
  lat: '53.7997',
  lon: '-1.5492',
}

beforeEach(() => jest.clearAllMocks())

describe('SearchBar', () => {
  it('renders the search input', () => {
    render(<SearchBar onSelect={jest.fn()} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('does not fetch for queries shorter than 3 characters', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSelect={jest.fn()} />)
    await user.type(screen.getByRole('searchbox'), 'Le')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches after 3+ character input and shows results', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockFetch.mockResolvedValue({ ok: true, json: async () => [mockResult] })

    render(<SearchBar onSelect={jest.fn()} />)
    await user.type(screen.getByRole('searchbox'), 'Leeds')
    act(() => { jest.runAllTimers() })

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/geocode?q=Leeds'),
    ))
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
    expect(screen.getByText('Leeds, West Yorkshire, England')).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('calls onSelect with parsed lat/lng when result is clicked', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const onSelect = jest.fn()
    mockFetch.mockResolvedValue({ ok: true, json: async () => [mockResult] })

    render(<SearchBar onSelect={onSelect} />)
    await user.type(screen.getByRole('searchbox'), 'Leeds')
    act(() => { jest.runAllTimers() })

    await waitFor(() => screen.getByRole('listbox'))
    await user.click(screen.getByText('Leeds, West Yorkshire, England'))

    expect(onSelect).toHaveBeenCalledWith(53.7997, -1.5492)
    jest.useRealTimers()
  })

  it('hides dropdown after selecting a result', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockFetch.mockResolvedValue({ ok: true, json: async () => [mockResult] })

    render(<SearchBar onSelect={jest.fn()} />)
    await user.type(screen.getByRole('searchbox'), 'Leeds')
    act(() => { jest.runAllTimers() })
    await waitFor(() => screen.getByRole('listbox'))
    await user.click(screen.getByText('Leeds, West Yorkshire, England'))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    jest.useRealTimers()
  })
})
