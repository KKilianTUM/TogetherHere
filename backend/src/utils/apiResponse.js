export function sendSuccess(res, data, options = {}) {
  const statusCode = options.statusCode || 200;

  return res.status(statusCode).json({
    success: true,
    data,
    error: null
  });
}

export function sendError(res, error, options = {}) {
  const statusCode = options.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred.'
    }
  });
}
