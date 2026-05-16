const AppError = require("../utils/app-error");

const allowedWorkspaceRoles = new Set(["owner", "admin", "member", "viewer"]);
const allowedWorkspaceStatuses = new Set(["active", "inactive"]);

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

const validateInviteWorkspaceUserPayload = (payload) => {
  const name = String(payload?.name || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const phone = String(payload?.phone || "").trim();
  const role = String(payload?.role || "member").trim().toLowerCase();

  if (!name) {
    throw new AppError("name is required.", 400);
  }

  if (!email) {
    throw new AppError("email is required.", 400);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new AppError("Please provide a valid email address.", 400);
  }

  if (!allowedWorkspaceRoles.has(role)) {
    throw new AppError("role must be one of: owner, admin, member, viewer.", 400);
  }

  return {
    name,
    email,
    phone,
    role,
  };
};

const validateUpdateWorkspaceUserPayload = (payload) => {
  const role = String(payload?.role || "").trim().toLowerCase();

  if (!allowedWorkspaceRoles.has(role)) {
    throw new AppError("role must be one of: owner, admin, member, viewer.", 400);
  }

  return {
    role,
  };
};

const validateUpdateWorkspaceUserStatusPayload = (payload) => {
  const status = String(payload?.status || "").trim().toLowerCase();

  if (!allowedWorkspaceStatuses.has(status)) {
    throw new AppError("status must be one of: active, inactive.", 400);
  }

  return {
    status,
  };
};

module.exports = {
  validateCreateWorkspacePayload,
  validateInviteWorkspaceUserPayload,
  validateUpdateWorkspaceUserPayload,
  validateUpdateWorkspaceUserStatusPayload,
  validateUpdateWorkspacePayload,
};
