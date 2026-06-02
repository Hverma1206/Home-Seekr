import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import OTPInput from '../components/ui/OTPInput'
import { authService } from '../services/authService'
import { useAuth } from '../hooks/useAuth'

export default function OTPVerificationPage() {
	const navigate = useNavigate()
	const location = useLocation()
	const { state } = location
	const { login } = useAuth()

	// Form data from signup
	const [formData, setFormData] = useState(null)
	const [otp, setOtp] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState(false)
	const [countdown, setCountdown] = useState(0)
	const [canResend, setCanResend] = useState(false)
	const [otpSent, setOtpSent] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		// Get form data from signup page
		if (state?.formData) {
			setFormData(state.formData)
			setOtpSent(true)
		} else {
			// Redirect to signup if no form data
			navigate('/login')
		}
	}, [state, navigate])

	// Countdown timer for resend
	useEffect(() => {
		let interval
		if (countdown > 0) {
			interval = setInterval(() => {
				setCountdown((c) => c - 1)
			}, 1000)
		} else if (countdown === 0 && otpSent) {
			setCanResend(true)
		}
		return () => clearInterval(interval)
	}, [countdown, otpSent])

	const handleVerifyOTP = async (e) => {
		e.preventDefault()
		setError('')
		setMessage('')

		if (!otp || otp.length !== 6) {
			setError('Please enter a valid 6-digit OTP')
			return
		}

		setLoading(true)

		try {
			const response = await authService.verifyOTP({
				phoneNumber: formData.phoneNumber,
				email: formData.email,
				otp: otp.toString(),
				password: formData.password,
				firstName: formData.firstName || '',
				lastName: formData.lastName || '',
			})

			setSuccess(true)
			setMessage('Phone verified successfully!')

			const token = response.data.data.token
			const user = response.data.data.user
			login({ token, user })

			// Redirect to dashboard after 2 seconds
			setTimeout(() => {
				navigate('/dashboard', { state: { user: response.data.data.user } })
			}, 2000)
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Failed to verify OTP. Please try again.'
			setError(errorMessage)
			setOtp('') // Clear OTP on error
		} finally {
			setLoading(false)
		}
	}

	const handleResendOTP = async () => {
		setError('')
		setMessage('')
		setCanResend(false)
		setCountdown(30)

		try {
			await authService.resendOTP(formData.phoneNumber, formData.email)

			setMessage('OTP resent successfully to ' + formData.phoneNumber)
			setOtp('')
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Failed to resend OTP. Please try again.'
			setError(errorMessage)
			setCanResend(true)
			setCountdown(0)
		}
	}

	const handleBack = () => {
		navigate(-1)
	}

	if (!formData) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
				<Loader className="w-8 h-8 text-emerald-600 animate-spin" />
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-md"
			>
				{/* Back button */}
				<button
					onClick={handleBack}
					className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					<span className="text-sm font-medium">Back</span>
				</button>

				{/* Card */}
				<div className="bg-white rounded-xl shadow-lg p-8 sm:p-10">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-slate-900 mb-2">
							Verify Your Phone
						</h1>
						<p className="text-slate-600">
							Enter the OTP sent to{' '}
							<span className="font-semibold text-emerald-600">
								{formData.phoneNumber}
							</span>
						</p>
					</div>

					<form onSubmit={handleVerifyOTP} className="space-y-6">
						{/* Error Message */}
						{error && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
							>
								<AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
								<span className="text-sm text-red-700">{error}</span>
							</motion.div>
						)}

						{/* Success Message */}
						{success && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg"
							>
								<CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
								<span className="text-sm text-green-700">{message}</span>
							</motion.div>
						)}

						{/* Info Message */}
						{message && !success && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
							>
								<AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
								<span className="text-sm text-blue-700">{message}</span>
							</motion.div>
						)}

						{/* OTP Input */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-4">
								6-Digit OTP
							</label>
							<OTPInput
								value={otp}
								onChange={setOtp}
								length={6}
								disabled={loading || success}
							/>
							<p className="text-xs text-slate-500 mt-3 text-center">
								OTP expires in 10 minutes
							</p>
						</div>

						{/* Verify Button */}
						<motion.button
							type="submit"
							disabled={loading || success || otp.length !== 6}
							whileHover={{ scale: 0.98 }}
							whileTap={{ scale: 0.95 }}
							className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<Loader size={18} className="animate-spin" />
									Verifying...
								</>
							) : success ? (
								<>
									<CheckCircle size={18} />
									Verified!
								</>
							) : (
								'Verify OTP'
							)}
						</motion.button>

						{/* Resend OTP */}
						<div className="text-center">
							{canResend ? (
								<button
									type="button"
									onClick={handleResendOTP}
									disabled={loading}
									className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
								>
									Resend OTP
								</button>
							) : countdown > 0 ? (
								<p className="text-sm text-slate-600">
									Resend OTP in{' '}
									<span className="font-semibold text-emerald-600">
										{countdown}s
									</span>
								</p>
							) : null}
						</div>
					</form>

					{/* Footer Info */}
					<div className="mt-8 pt-6 border-t border-slate-200">
						<p className="text-xs text-slate-500 text-center">
							By verifying your phone, you agree to our{' '}
							<a href="#" className="text-emerald-600 hover:underline">
								Terms of Service
							</a>{' '}
							and{' '}
							<a href="#" className="text-emerald-600 hover:underline">
								Privacy Policy
							</a>
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	)
}
