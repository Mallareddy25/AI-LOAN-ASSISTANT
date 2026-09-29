'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Zod-backed request validation.
 *
 * Usage:
 *   router.post('/', validate({ body: createUserSchema }), controller.create)
 *
 * Validated output REPLACES the raw input, so handlers only ever see
 * coerced, stripped, known-shape data. Unknown keys are dropped by zod,
 * which prevents mass-assignment style attacks.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      if (schemas.query) {
        // req.query is a getter in Express 5; assign to a dedicated field.
        req.validatedQuery = schemas.query.parse(req.query ?? {});
        req.query = req.validatedQuery;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params ?? {});
      }
      return next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const fields = {};
        error.errors.forEach((issue) => {
          const key = issue.path.length ? issue.path.join('.') : '_root';
          if (!fields[key]) fields[key] = issue.message;
        });
        return next(
          ApiError.unprocessable('Please check the highlighted fields and try again.', {
            fields,
            details: error.errors.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          }),
        );
      }
      return next(error);
    }
  };
}

module.exports = { validate };
