import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function OTPInput({ value, onChange, length = 6, disabled = false }) {
	const [otp, setOtp] = useState(Array(length).fill(''))
	const inputRefs = useRef([])

	useEffect(() => {
		if (value) {
			const otpArray = value.toString().split('')
			setOtp(otpArray.padEnd(length, ''))
		}
	}, [value, length])

	const handleChange = (index, event) => {
		const { value } = event.target
		if (isNaN(value)) return

		const newOtp = [...otp]
		newOtp[index] = value.substring(value.length - 1)
		setOtp(newOtp)

		// Call onChange with the complete OTP
		onChange(newOtp.join(''))

		// Move to next input
		if (value && index < length - 1) {
			inputRefs.current[index + 1].focus()
		}
	}

	const handleKeyDown = (index, event) => {
		if (event.key === 'Backspace' && !otp[index] && index > 0) {
			inputRefs.current[index - 1].focus()
		}

		// Move to previous on left arrow
		if (event.key === 'ArrowLeft' && index > 0) {
			inputRefs.current[index - 1].focus()
		}

		// Move to next on right arrow
		if (event.key === 'ArrowRight' && index < length - 1) {
			inputRefs.current[index + 1].focus()
		}
	}

	const handlePaste = (event) => {
		const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '')
		if (pastedValue) {
			event.preventDefault()
			const newOtp = pastedValue.split('').slice(0, length)
			setOtp(newOtp.padEnd(length, ''))
			onChange(newOtp.join(''))

			if (newOtp.length === length) {
				inputRefs.current[length - 1].blur()
			} else {
				inputRefs.current[newOtp.length].focus()
			}
		}
	}

	return (
		<div className="flex justify-center gap-2 sm:gap-3">
			{otp.map((value, index) => (
				<motion.input
					key={index}
					ref={(ref) => (inputRefs.current[index] = ref)}
					type="text"
					inputMode="numeric"
					maxLength="1"
					value={value}
					onChange={(e) => handleChange(index, e)}
					onKeyDown={(e) => handleKeyDown(index, e)}
					onPaste={handlePaste}
					disabled={disabled}
					initial={{ scale: 1 }}
					whileFocus={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
					aria-label={`OTP digit ${index + 1}`}
				/>
			))}
		</div>
	)
}
