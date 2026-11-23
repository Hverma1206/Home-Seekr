import { useRef } from 'react'

// Controlled OTP boxes: `value` is the digit string, `onChange` receives the new string.
// Supports typing, backspace, arrow keys, pasting the whole code and SMS autofill.
export default function OTPInput({ value = '', onChange, length = 6, disabled = false, autoFocus = false }) {
	const inputRefs = useRef([])
	const digits = Array.from({ length }, (_, i) => value[i] || '')

	const focusBox = (index) => {
		inputRefs.current[Math.max(0, Math.min(length - 1, index))]?.focus()
	}

	const fillFrom = (index, text) => {
		const incoming = text.replace(/\D/g, '')
		if (!incoming) return
		const next = [...digits]
		incoming.split('').slice(0, length - index).forEach((digit, offset) => {
			next[index + offset] = digit
		})
		onChange(next.join('').slice(0, length))
		focusBox(index + incoming.length)
	}

	const handleChange = (index, event) => {
		const typed = event.target.value.replace(/\D/g, '')
		if (!typed) {
			const next = [...digits]
			next[index] = ''
			onChange(next.join(''))
			return
		}
		// More than one character means autofill or a fast paste into a single box
		fillFrom(index, typed.length > 1 ? typed : typed.slice(-1))
	}

	const handleKeyDown = (index, event) => {
		if (event.key === 'Backspace' && !digits[index] && index > 0) {
			event.preventDefault()
			const next = [...digits]
			next[index - 1] = ''
			onChange(next.join(''))
			focusBox(index - 1)
		}
		if (event.key === 'ArrowLeft') focusBox(index - 1)
		if (event.key === 'ArrowRight') focusBox(index + 1)
	}

	const handlePaste = (index, event) => {
		event.preventDefault()
		fillFrom(index, event.clipboardData.getData('text'))
	}

	return (
		<div className="flex justify-between gap-2 sm:gap-3">
			{digits.map((digit, index) => (
				<input
					key={index}
					ref={(ref) => (inputRefs.current[index] = ref)}
					type="text"
					inputMode="numeric"
					autoComplete={index === 0 ? 'one-time-code' : 'off'}
					autoFocus={autoFocus && index === 0}
					maxLength={index === 0 ? length : 1}
					value={digit}
					onChange={(e) => handleChange(index, e)}
					onKeyDown={(e) => handleKeyDown(index, e)}
					onPaste={(e) => handlePaste(index, e)}
					onFocus={(e) => e.target.select()}
					disabled={disabled}
					aria-label={`OTP digit ${index + 1}`}
					className="w-11 h-14 sm:w-12 text-center text-xl font-black text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-slate-900 outline-none transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
				/>
			))}
		</div>
	)
}
