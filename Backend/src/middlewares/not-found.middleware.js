const notFoundMiddleware = (_request, response) => {
  response.status(404).json({
    message: "Route not found.",
  });
};

module.exports = notFoundMiddleware;
