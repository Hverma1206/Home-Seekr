import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

const readStoredUser = () => {
	try {
		const raw = localStorage.getItem(USER_KEY)
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

const readStoredToken = () => localStorage.getItem(TOKEN_KEY)

export const AuthProvider = ({ children }) => {
	const navigate = useNavigate()
	const location = useLocation()
	const [user, setUser] = useState(() => readStoredUser())
	const [token, setToken] = useState(() => readStoredToken())
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')

	const persistSession = useCallback((nextToken, nextUser) => {
		if (nextToken) {
			localStorage.setItem(TOKEN_KEY, nextToken)
			setToken(nextToken)
		}
		if (nextUser) {
			localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
			setUser(nextUser)
		}
	}, [])

	const clearSession = useCallback(
		({ redirectTo, state } = {}) => {
			localStorage.removeItem(TOKEN_KEY)
			localStorage.removeItem(USER_KEY)
			setUser(null)
			setToken(null)
			if (redirectTo) {
				navigate(redirectTo, { replace: true, state })
			}
		},
		[navigate],
	)

	const refreshUser = useCallback(async () => {
		try {
			const response = await authService.getMe()
			const currentUser = response?.data?.data?.user || response?.data?.data
			if (currentUser) {
				persistSession(readStoredToken(), currentUser)
			}
			return currentUser
		} catch (err) {
			clearSession({ redirectTo: '/login', state: { from: location.pathname } })
			return null
		}
	}, [clearSession, location.pathname, persistSession])

	const login = useCallback(
		({ token: nextToken, user: nextUser, redirectTo } = {}) => {
			setError('')
			persistSession(nextToken, nextUser)
			if (redirectTo) {
				navigate(redirectTo, { replace: true })
			}
		},
		[navigate, persistSession],
	)

	const logout = useCallback(
		({ redirectTo = '/' } = {}) => {
			setError('')
			clearSession({ redirectTo })
		},
		[clearSession],
	)

	const updateProfile = useCallback(
		async (payload) => {
			setError('')
			const response = await authService.updateProfile(payload)
			const updatedUser = response?.data?.data?.user || response?.data?.user
			if (updatedUser) {
				persistSession(readStoredToken(), updatedUser)
			}
			return updatedUser
		},
		[persistSession],
	)

	useEffect(() => {
		let isMounted = true
		const initialize = async () => {
			const storedToken = readStoredToken()
			if (!storedToken) {
				setIsLoading(false)
				return
			}
			try {
				const response = await authService.getMe()
				const currentUser = response?.data?.data?.user || response?.data?.data
				if (isMounted) {
					persistSession(storedToken, currentUser)
				}
			} catch {
				if (isMounted) {
					clearSession()
				}
			} finally {
				if (isMounted) {
					setIsLoading(false)
				}
			}
		}

		initialize()
		return () => {
			isMounted = false
		}
	}, [clearSession, persistSession])

	useEffect(() => {
		const handleStorage = (event) => {
			if (event.key === TOKEN_KEY && !event.newValue) {
				clearSession({ redirectTo: '/login', state: { from: location.pathname } })
			}
		}

		const handleForcedLogout = (event) => {
			const reason = event?.detail?.reason
			const redirectTo = reason === 'unauthorized' ? '/login' : '/'
			clearSession({ redirectTo, state: { from: location.pathname } })
		}

		window.addEventListener('storage', handleStorage)
		window.addEventListener('auth:logout', handleForcedLogout)
		return () => {
			window.removeEventListener('storage', handleStorage)
			window.removeEventListener('auth:logout', handleForcedLogout)
		}
	}, [clearSession, location.pathname])

	const value = useMemo(
		() => ({
			user,
			token,
			isAuthenticated: Boolean(user && token),
			isLoading,
			error,
			login,
			logout,
			refreshUser,
			updateProfile,
			setError,
		}),
		[user, token, isLoading, error, login, logout, refreshUser, updateProfile],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthContextConsumer = AuthContext

export default AuthContext
