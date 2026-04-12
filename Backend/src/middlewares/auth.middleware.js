const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/app-error");

const requireAuth = (request, _response, next) => {
  const authorizationHeader = request.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new AppError("Authorization token is required.", 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    request.user = payload;
    next();
  } catch (_error) {
    next(new AppError("Invalid or expired token.", 401));
  }
};

module.exports = {
  requireAuth,
};
