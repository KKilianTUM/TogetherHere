function getErrorLabel(statusCode) {
  if (statusCode === 401) {
    return 'Unauthorized';
  }

  if (statusCode === 403) {
    return 'Forbidden';
  }

  if (statusCode >= 500) {
    return 'Internal Server Error';
  }

  return 'Request Error';
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}

export function errorHandler(err, req, res, next) {
  const statusCode = Number(err.statusCode || err.status || 500);
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: getErrorLabel(statusCode),
    message
  });
}
