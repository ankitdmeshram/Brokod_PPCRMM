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
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    next(new AppError("Invalid or expired token.", 401));
    return;
  }

  const user = await userRepository.findById(payload.sub);

  if (!user) {
    next(new AppError("User not found.", 404));
    return;
  }

  if (!user.is_active) {
    next(new AppError("Your account is inactive. Please contact support.", 403));
    return;
  }

  request.user = payload;
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
