function errorHandlerMiddleware(err, req, res, next) {
  res.status(500).json({
    error: 'Error de servidor',
    details: err?.message || 'No especificado'
  })
}

export default errorHandlerMiddleware
