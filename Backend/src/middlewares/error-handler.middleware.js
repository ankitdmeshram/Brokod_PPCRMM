const AppError = require("../utils/app-error");

const errorHandlerMiddleware = (error, _request, response, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message =
    error instanceof AppError ? error.message : "Internal server error.";

  if (!(error instanceof AppError)) {
    console.error(error);
  }

  response.status(statusCode).json({
    message,
  });
};

module.exports = errorHandlerMiddleware;
