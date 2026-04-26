import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MapErrorBoundary from '@/components/map/MapErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Map exploded')
  return <div>Map loaded</div>
}

// Suppress React's error boundary console.error output in test output
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe('MapErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <MapErrorBoundary>
        <Bomb shouldThrow={false} />
      </MapErrorBoundary>,
    )
    expect(screen.getByText('Map loaded')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    render(
      <MapErrorBoundary>
        <Bomb shouldThrow={true} />
      </MapErrorBoundary>,
    )
    expect(screen.getByText('Map failed to load')).toBeInTheDocument()
    expect(screen.getByText('Map exploded')).toBeInTheDocument()
  })

  it('shows a retry button when error is caught', () => {
    render(
      <MapErrorBoundary>
        <Bomb shouldThrow={true} />
      </MapErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('clears error state when retry is clicked', async () => {
    const user = userEvent.setup()
    let throwFlag = true
    function MaybeThrow() {
      if (throwFlag) throw new Error('Map exploded')
      return <div>Map loaded</div>
    }

    render(
      <MapErrorBoundary>
        <MaybeThrow />
      </MapErrorBoundary>,
    )
    expect(screen.getByText('Map failed to load')).toBeInTheDocument()

    throwFlag = false
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(screen.getByText('Map loaded')).toBeInTheDocument()
  })
})
