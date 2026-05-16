const authService = require("../services/auth.service");
const asyncHandler = require("../middlewares/async-handler.middleware");

const signup = asyncHandler(async (request, response) => {
  const result = await authService.signup(request.body);

  response.status(201).json({
    message: "Signup successful.",
    user: result,
  });
});

const signin = asyncHandler(async (request, response) => {
  const result = await authService.signin(request.body);

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
  me,
  signin,
  signup,
  updateMe,
};
