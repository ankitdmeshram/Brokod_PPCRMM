const asyncHandler = require("../middlewares/async-handler.middleware");
const userService = require("../services/user.service");

const getUsers = asyncHandler(async (request, response) => {
  const result = await userService.getUsers({
    search: request.query.search,
    page: request.query.page,
    limit: request.query.limit,
  });

  response.status(200).json({
    users: result.users,
    pagination: result.pagination,
  });
});

const exportDatabase = asyncHandler(async (_request, response) => {
  const result = await userService.exportDatabaseAsJson();

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  response.status(200).send(JSON.stringify(result.content, null, 2));
});

const updateUserStatus = asyncHandler(async (request, response) => {
  const user = await userService.updateUserStatus(
    request.params.userId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "User status updated successfully.",
    user,
  });
});

const updateUser = asyncHandler(async (request, response) => {
  const user = await userService.updateUser(
    request.params.userId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "User updated successfully.",
    user,
  });
});

const deleteUser = asyncHandler(async (request, response) => {
  await userService.deleteUser(request.params.userId, request.user.sub);

  response.status(200).json({
    message: "User deleted successfully.",
  });
});

module.exports = {
  deleteUser,
  exportDatabase,
  getUsers,
  updateUser,
  updateUserStatus,
};
