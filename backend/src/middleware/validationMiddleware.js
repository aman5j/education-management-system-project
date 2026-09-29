import {
  validationResult,
} from "express-validator";

const validationMiddleware = (
  req,
  res,
  next
) => {
  const result =
    validationResult(req);

  if (!result.isEmpty()) {
    const errors =
      result.array().map(
        (error) => ({
          field:
            error.path ||
            error.param,
          message:
            error.msg,
        })
      );

    return res.status(422).json({
      success: false,
      message:
        "Validation failed",
      errors,
    });
  }

  next();
};

export default validationMiddleware;