export class ApiError extends Error {
  constructor({ statusCode = 500, code = 'INTERNAL_ERROR', message = 'Internal Server Error' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function unauthorizedError(code, message) {
  return new ApiError({ statusCode: 401, code, message });
}

export function forbiddenError(code, message) {
  return new ApiError({ statusCode: 403, code, message });
}
