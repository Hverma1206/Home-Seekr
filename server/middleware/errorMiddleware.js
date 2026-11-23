export const notFound = (req, res, _next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

export const errorHandler = (err, _req, res, _next) => {
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate field value',
      field: Object.keys(err.keyValue || {})[0],
    })
  }

  // A malformed id in the URL (e.g. /details/abc) is a missing record, not a server crash
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'Not found' })
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((item) => item.message)
    return res.status(400).json({
      message: errors.join(', ') || 'Validation failed',
      errors,
    })
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500
  return res.status(statusCode).json({
    message: err.message || 'Server error',
  })
}
