const AppError = require("../utils/app-error");

const validateCreateWorkspacePayload = (payload) => {
  const workspaceName = payload?.workspaceName?.trim();
  const workspaceDescription = payload?.workspaceDescription?.trim() || "";

  if (!workspaceName) {
    throw new AppError("workspaceName is required.", 400);
  }

  return {
    workspaceName,
    workspaceDescription,
  };
};

const validateUpdateWorkspacePayload = (payload) => {
  const workspaceName = payload?.workspaceName?.trim();
  const workspaceDescription = payload?.workspaceDescription?.trim() || "";

  if (!workspaceName) {
    throw new AppError("workspaceName is required.", 400);
  }

  return {
    workspaceName,
    workspaceDescription,
  };
};

module.exports = {
  validateCreateWorkspacePayload,
  validateUpdateWorkspacePayload,
};
