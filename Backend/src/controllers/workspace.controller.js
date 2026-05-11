const asyncHandler = require("../middlewares/async-handler.middleware");
const workspaceService = require("../services/workspace.service");

const createWorkspace = asyncHandler(async (request, response) => {
  const workspace = await workspaceService.createWorkspace(
    request.body,
    request.user.sub
  );

  response.status(201).json({
    message: "Workspace created successfully.",
    workspace,
  });
});

const getWorkspaces = asyncHandler(async (request, response) => {
  const workspaces = await workspaceService.getWorkspaces(request.user.sub);

  response.status(200).json({
    workspaces,
  });
});

const getWorkspaceUsers = asyncHandler(async (request, response) => {
  const result = await workspaceService.getWorkspaceUsers(
    request.workspaceId,
    request.query
  );

  response.status(200).json({
    users: result.users,
    pagination: result.pagination,
  });
});

const getWorkspaceNotifications = asyncHandler(async (request, response) => {
  const notifications = await workspaceService.getWorkspaceNotifications(
    request.workspaceId,
    request.user.sub,
    request.query
  );

  response.status(200).json({
    notifications,
  });
});

const inviteWorkspaceUser = asyncHandler(async (request, response) => {
  const result = await workspaceService.inviteWorkspaceUser(
    request.workspaceId,
    request.body,
    request.user.sub
  );

  response.status(201).json({
    message: "Workspace user invited successfully.",
    user: result.user,
    temporaryPassword: result.temporaryPassword,
    createdNewUser: result.createdNewUser,
  });
});

const updateWorkspaceUser = asyncHandler(async (request, response) => {
  const user = await workspaceService.updateWorkspaceUser(
    request.workspaceId,
    request.params.userId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "Workspace user updated successfully.",
    user,
  });
});

const deleteWorkspaceUser = asyncHandler(async (request, response) => {
  await workspaceService.deleteWorkspaceUser(
    request.workspaceId,
    request.params.userId,
    request.user.sub
  );

  response.status(200).json({
    message: "Workspace user removed successfully.",
  });
});

const updateWorkspaceUserStatus = asyncHandler(async (request, response) => {
  const user = await workspaceService.updateWorkspaceUserStatus(
    request.workspaceId,
    request.params.userId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "Workspace user status updated successfully.",
    user,
  });
});

const updateWorkspace = asyncHandler(async (request, response) => {
  const workspace = await workspaceService.updateWorkspace(
    request.workspaceId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "Workspace updated successfully.",
    workspace,
  });
});

const deleteWorkspace = asyncHandler(async (request, response) => {
  await workspaceService.deleteWorkspace(request.workspaceId, request.user.sub);

  response.status(200).json({
    message: "Workspace deleted successfully.",
  });
});

module.exports = {
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaceUser,
  getWorkspaceNotifications,
  getWorkspaceUsers,
  getWorkspaces,
  inviteWorkspaceUser,
  updateWorkspaceUser,
  updateWorkspaceUserStatus,
  updateWorkspace,
};
