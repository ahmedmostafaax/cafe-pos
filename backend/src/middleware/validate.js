import AppError from "../utils/AppError.js";

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(
      {
        body: req.body,
        params: req.params,
        query: req.query,
      },
      { abortEarly: false, allowUnknown: true }
    );

    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      return next(new AppError(message, 400));
    }
    next();
  };
};

export default validate;
