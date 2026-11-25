import { useCallback, useEffect, useState } from 'react'

const UNSUPPORTED_ERROR = 'Geolocation is not supported by your browser.'
const DENIED_ERROR = 'Location access denied. Showing nearby popular listings instead.'

const isSupported = () => typeof navigator !== 'undefined' && Boolean(navigator.geolocation)

const useGeoLocation = ({ auto = true, timeout = 10000 } = {}) => {
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState(() => (auto && !isSupported() ? UNSUPPORTED_ERROR : ''))
  const [loading, setLoading] = useState(() => auto && isSupported())

  // State is only set from the browser's callbacks, so this is safe to start from an effect
  const locate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        setCoords({ latitude: position.latitude, longitude: position.longitude })
        setLoading(false)
      },
      () => {
        setError(DENIED_ERROR)
        setLoading(false)
      },
      { timeout },
    )
  }, [timeout])

  const request = useCallback(() => {
    if (!isSupported()) {
      setError(UNSUPPORTED_ERROR)
      return
    }
    setLoading(true)
    setError('')
    locate()
  }, [locate])

  useEffect(() => {
    if (auto && isSupported()) {
      locate()
    }
  }, [auto, locate])

  return { coords, error, loading, request }
}

export default useGeoLocation
