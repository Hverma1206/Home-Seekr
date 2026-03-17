export const notFound = (req, res, _next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

export const errorHandler = (err, _req, res, _next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((item) => item.message),
    })
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500
  return res.status(statusCode).json({
    message: err.message || 'Server error',
  })
}
