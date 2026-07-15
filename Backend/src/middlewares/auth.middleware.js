const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/app-error");
const userRepository = require("../repositories/user.repository");

const requireAuth = async (request, _response, next) => {
  const authorizationHeader = request.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new AppError("Authorization token is required.", 401));
    return;
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      audience: env.jwtAudience,
      issuer: env.jwtIssuer,
    });
  } catch (_error) {
    next(new AppError("Invalid or expired token.", 401));
    return;
  }

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    next(new AppError("Invalid or expired token.", 401));
    return;
  }

  const user = await userRepository.findById(userId);

  if (!user) {
    next(new AppError("User not found.", 404));
    return;
  }

  if (!user.is_active) {
    next(new AppError("Your account is inactive. Please contact support.", 403));
    return;
  }

  // Authorization must use current database values, not potentially stale JWT claims.
  request.user = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  next();
};

const requireSuperAdmin = (request, _response, next) => {
  const role = String(request.user?.role || "").trim().toLowerCase();

  if (role !== "super-admin") {
    next(new AppError("Only super admins can access this resource.", 403));
    return;
  }

  next();
};

module.exports = {
  requireAuth,
  requireSuperAdmin,
};
