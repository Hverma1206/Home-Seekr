export const healthCheck = (_req, res) => {
  res.status(200).json({ ok: true, message: 'EstateHub API is running' })
}
