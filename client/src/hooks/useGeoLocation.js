import { useCallback, useEffect, useState } from 'react'

const DEFAULT_ERROR = 'Unable to fetch your location.'

const useGeoLocation = ({ auto = true, timeout = 10000 } = {}) => {
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        setCoords({ latitude: position.latitude, longitude: position.longitude })
        setLoading(false)
      },
      () => {
        setError('Location access denied. Showing nearby popular listings instead.')
        setLoading(false)
      },
      { timeout },
    )
  }, [timeout])

  useEffect(() => {
    if (auto) {
      request()
    }
  }, [auto, request])

  return { coords, error, loading, request }
}

export default useGeoLocation
