const crypto = require("crypto");

const authService = require("../services/auth.service");
const authTrailService = require("../services/auth-trail.service");
const asyncHandler = require("../middlewares/async-handler.middleware");

const createAuthTrailContext = (request, response) => {
  const requestId = crypto.randomUUID();
  response.set("X-Request-Id", requestId);

  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent"),
    requestId,
  };
};

const signup = asyncHandler(async (request, response) => {
  const result = await authService.signup(
    request.body,
    createAuthTrailContext(request, response)
  );

  response.status(201).json({
    message: "Signup successful.",
    user: result,
  });
});

const signin = asyncHandler(async (request, response) => {
  const result = await authService.signin(
    request.body,
    createAuthTrailContext(request, response)
  );

  response.status(200).json(result);
});

const signout = asyncHandler(async (request, response) => {
  const result = await authService.signout(
    request.user,
    createAuthTrailContext(request, response)
  );

  response.status(200).json(result);
});

const getAuthTrails = asyncHandler(async (request, response) => {
  const result = await authTrailService.getAuthTrails(request.query);

  response.status(200).json(result);
});

const me = asyncHandler(async (request, response) => {
  const user = await authService.getCurrentUser(request.user.sub);

  response.status(200).json({
    user,
  });
});

const updateMe = asyncHandler(async (request, response) => {
  const user = await authService.updateCurrentUser(request.user.sub, request.body);

  response.status(200).json({
    message: "Profile updated successfully.",
    user,
  });
});

module.exports = {
  getAuthTrails,
  me,
  signin,
  signout,
  signup,
  updateMe,
};
