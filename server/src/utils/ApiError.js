'use strict';

/**
 * Operational error carrying an HTTP status code and a stable machine code.
 * Anything thrown that is *not* an ApiError is treated as an unexpected
 * failure and is reported as a generic 500 with no internal detail.
 */
class ApiError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} message Safe, user-facing message
   * @param {object} [options]
   * @param {string} [options.code]      Machine-readable code for the client
   * @param {string} [options.details]   Optional field-level detail
   * @param {object} [options.fields]    Map of field -> message
   * @param {Error}  [options.cause]     Original error (never serialised)
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code || defaultCodeForStatus(status);
    this.details = options.details;
    this.fields = options.fields;
    this.cause = options.cause;
    this.isOperational = true;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message = 'Invalid request', options = {}) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...options });
  }

  static unauthorized(message = 'Authentication required', options = {}) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED', ...options });
  }

  static forbidden(message = 'You do not have permission to perform this action', options = {}) {
    return new ApiError(403, message, { code: 'FORBIDDEN', ...options });
  }

  static notFound(message = 'Resource not found', options = {}) {
    return new ApiError(404, message, { code: 'NOT_FOUND', ...options });
  }

  static conflict(message = 'Resource already exists', options = {}) {
    return new ApiError(409, message, { code: 'CONFLICT', ...options });
  }

  static unprocessable(message = 'Validation failed', options = {}) {
    return new ApiError(422, message, { code: 'VALIDATION_ERROR', ...options });
  }

  static tooManyRequests(message = 'Too many requests, please try again later', options = {}) {
    return new ApiError(429, message, { code: 'RATE_LIMITED', ...options });
  }

  static internal(message = 'Something went wrong on our side', options = {}) {
    return new ApiError(500, message, { code: 'INTERNAL_ERROR', ...options });
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', options = {}) {
    return new ApiError(503, message, { code: 'SERVICE_UNAVAILABLE', ...options });
  }
}

function defaultCodeForStatus(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] || 'ERROR';
}

module.exports = ApiError;
