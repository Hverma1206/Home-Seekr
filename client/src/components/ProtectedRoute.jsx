import { Navigate, useLocation } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const ProtectedRoute = ({ children }) => {
	const { isAuthenticated, isLoading } = useAuth()
	const location = useLocation()

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-white">
				<div className="flex items-center gap-3 text-slate-600">
					<Loader className="w-5 h-5 animate-spin" />
					<span className="text-sm font-semibold">Checking session...</span>
				</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />
	}

	return children
}

export default ProtectedRoute
