import { sendError } from '../utils/apiResponse.js';

export function notFoundHandler(req, res) {
  sendError(
    res,
    {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    },
    { statusCode: 404 }
  );
}

export function errorHandler(err, req, res, next) {
  const statusCode = Number(err.statusCode || err.status || 500);
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error(err);
  }

  sendError(
    res,
    {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message
    },
    { statusCode }
  );
}
