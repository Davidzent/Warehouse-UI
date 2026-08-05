import { useCallback, useEffect, useState } from 'react'
import { fetchLocations } from '../api/receiving'
import type { Location } from '../api/types'
import { ErrorBanner } from './ErrorBanner'

/** Every put-away location. The route returns all of them — there is no paging. */
export function LocationsPanel() {
  const [locations, setLocations] = useState<Location[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    fetchLocations().then(
      (rows) => {
        setLocations(rows)
        setError(null)
      },
      (failure) => {
        setLocations(null)
        setError(failure)
      },
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section>
      <h2>
        Locations <button onClick={load}>Refresh</button>
      </h2>

      <ErrorBanner error={error} />

      {!locations && !error && <p>Loading locations…</p>}
      {locations?.length === 0 && <p>No locations are configured.</p>}

      {locations && locations.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr key={location.locationId}>
                <td>{location.locationCode}</td>
                <td>{location.locationType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
