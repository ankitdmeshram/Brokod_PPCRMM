const AppError = require("../utils/app-error");

const allowedStatuses = new Set(["planned", "in_progress", "on_hold", "completed", "cancelled"]);
const allowedAccessValues = new Set(["private", "public"]);
const allowedProjectUserRoles = new Set(["owner", "admin", "member"]);
const allowedProjectUserInviteModes = new Set([
  "existing_workspace_user",
  "invite_user",
]);
const allowedProjectUserStatuses = new Set(["active", "inactive"]);

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const validateProjectDates = (startDate, endDate) => {
  if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
    throw new AppError("Please provide valid startDate and endDate values.", 400);
  }

  if (new Date(endDate) < new Date(startDate)) {
    throw new AppError("endDate cannot be earlier than startDate.", 400);
  }
};

const validateCreateProjectPayload = (payload) => {
  const workspaceId = Number(payload?.workspaceId);
  const projectName = payload?.projectName?.trim();
  const description = payload?.description?.trim() || "";
  const status = payload?.status?.trim().toLowerCase() || "planned";
  const access = payload?.access?.trim().toLowerCase() || "private";
  const startDate = payload?.startDate?.trim() || null;
  const endDate = payload?.endDate?.trim() || null;
  const tags = normalizeTags(payload?.tags);

  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new AppError("workspaceId is required and must be a valid integer.", 400);
  }

  if (!projectName) {
    throw new AppError("workspaceId and projectName are required.", 400);
  }

  if (!allowedStatuses.has(status)) {
    throw new AppError(
      "status must be one of: planned, in_progress, on_hold, completed, cancelled.",
      400
    );
  }

  if (!allowedAccessValues.has(access)) {
    throw new AppError("access must be either private or public.", 400);
  }

  if (startDate && endDate) {
    validateProjectDates(startDate, endDate);
  }

  return {
    workspaceId,
    projectName,
    description,
    status,
    access,
    startDate,
    endDate,
    tags,
  };
};

const validateUpdateProjectPayload = (payload, currentProject) => {
  const updates = {};

  if (payload?.projectName !== undefined) {
    const projectName = payload.projectName?.trim();
    if (!projectName) {
      throw new AppError("projectName cannot be empty.", 400);
    }
    updates.projectName = projectName;
  }

  if (payload?.workspaceId !== undefined) {
    const workspaceId = Number(payload.workspaceId);
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      throw new AppError("workspaceId must be a valid integer.", 400);
    }
    updates.workspaceId = workspaceId;
  }

  if (payload?.description !== undefined) {
    updates.description = payload.description?.trim() || "";
  }

  if (payload?.status !== undefined) {
    const status = payload.status?.trim().toLowerCase();
    if (!allowedStatuses.has(status)) {
      throw new AppError(
        "status must be one of: planned, in_progress, on_hold, completed, cancelled.",
        400
      );
    }
    updates.status = status;
  }

  if (payload?.access !== undefined) {
    const access = payload.access?.trim().toLowerCase();
    if (!allowedAccessValues.has(access)) {
      throw new AppError("access must be either private or public.", 400);
    }
    updates.access = access;
  }

  if (payload?.startDate !== undefined) {
    updates.startDate = payload.startDate?.trim() || null;
  }

  if (payload?.endDate !== undefined) {
    updates.endDate = payload.endDate?.trim() || null;
  }

  if (payload?.tags !== undefined) {
    updates.tags = normalizeTags(payload.tags);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Provide at least one field to update.", 400);
  }

  const finalStartDate = updates.startDate ?? currentProject.start_date ?? currentProject.startDate;
  const finalEndDate = updates.endDate ?? currentProject.end_date ?? currentProject.endDate;

  if (finalStartDate && finalEndDate) {
    validateProjectDates(finalStartDate, finalEndDate);
  }

  return updates;
};

const validateAddProjectUserPayload = (payload) => {
  const mode = String(payload?.mode || "").trim().toLowerCase();
  const role = String(payload?.role || "").trim().toLowerCase();

  if (!allowedProjectUserInviteModes.has(mode)) {
    throw new AppError(
      "mode must be either existing_workspace_user or invite_user.",
      400
    );
  }

  if (!allowedProjectUserRoles.has(role)) {
    throw new AppError("role must be one of: owner, admin, member.", 400);
  }

  if (mode === "existing_workspace_user") {
    const userId = Number(payload?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError("userId is required for existing workspace users.", 400);
    }

    return {
      mode,
      role,
      userId,
    };
  }

  const name = String(payload?.name || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const phone = String(payload?.phone || "").trim();

  if (!name || !email) {
    throw new AppError("name and email are required for invited users.", 400);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new AppError("Please provide a valid email address.", 400);
  }

  return {
    mode,
    role,
    name,
    email,
    phone,
  };
};

const validateUpdateProjectUserPayload = (payload) => {
  const updates = {};

  if (payload?.role !== undefined) {
    const role = String(payload.role || "").trim().toLowerCase();

    if (!allowedProjectUserRoles.has(role)) {
      throw new AppError("role must be one of: owner, admin, member.", 400);
    }

    updates.role = role;
  }

  if (payload?.status !== undefined) {
    const status = String(payload.status || "").trim().toLowerCase();

    if (!allowedProjectUserStatuses.has(status)) {
      throw new AppError("status must be either active or inactive.", 400);
    }

    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Provide at least one field to update.", 400);
  }

  return updates;
};

module.exports = {
  validateAddProjectUserPayload,
  validateCreateProjectPayload,
  validateUpdateProjectUserPayload,
  validateUpdateProjectPayload,
};
