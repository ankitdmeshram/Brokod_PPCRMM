const AppError = require("../utils/app-error");

const allowedStatuses = new Set(["planned", "in_progress", "on_hold", "completed", "cancelled"]);

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

  if (startDate && endDate) {
    validateProjectDates(startDate, endDate);
  }

  return {
    workspaceId,
    projectName,
    description,
    status,
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

module.exports = {
  validateCreateProjectPayload,
  validateUpdateProjectPayload,
};
