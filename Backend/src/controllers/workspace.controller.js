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

const updateWorkspace = asyncHandler(async (request, response) => {
  const workspace = await workspaceService.updateWorkspace(
    request.params.workspaceId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "Workspace updated successfully.",
    workspace,
  });
});

const deleteWorkspace = asyncHandler(async (request, response) => {
  await workspaceService.deleteWorkspace(request.params.workspaceId, request.user.sub);

  response.status(200).json({
    message: "Workspace deleted successfully.",
  });
});

module.exports = {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  updateWorkspace,
};
