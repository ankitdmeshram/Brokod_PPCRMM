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
  const projectName = payload?.projectName?.trim();
  const description = payload?.description?.trim();
  const status = payload?.status?.trim().toLowerCase();
  const startDate = payload?.startDate?.trim();
  const endDate = payload?.endDate?.trim();
  const tags = normalizeTags(payload?.tags);

  if (!projectName || !description || !status || !startDate || !endDate) {
    throw new AppError(
      "projectName, description, status, startDate, and endDate are required.",
      400
    );
  }

  if (!allowedStatuses.has(status)) {
    throw new AppError(
      "status must be one of: planned, in_progress, on_hold, completed, cancelled.",
      400
    );
  }

  validateProjectDates(startDate, endDate);

  return {
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

  if (payload?.description !== undefined) {
    const description = payload.description?.trim();
    if (!description) {
      throw new AppError("description cannot be empty.", 400);
    }
    updates.description = description;
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
    const startDate = payload.startDate?.trim();
    if (!startDate) {
      throw new AppError("startDate cannot be empty.", 400);
    }
    updates.startDate = startDate;
  }

  if (payload?.endDate !== undefined) {
    const endDate = payload.endDate?.trim();
    if (!endDate) {
      throw new AppError("endDate cannot be empty.", 400);
    }
    updates.endDate = endDate;
  }

  if (payload?.tags !== undefined) {
    updates.tags = normalizeTags(payload.tags);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Provide at least one field to update.", 400);
  }

  const finalStartDate = updates.startDate ?? currentProject.start_date ?? currentProject.startDate;
  const finalEndDate = updates.endDate ?? currentProject.end_date ?? currentProject.endDate;

  validateProjectDates(finalStartDate, finalEndDate);

  return updates;
};

module.exports = {
  validateCreateProjectPayload,
  validateUpdateProjectPayload,
};
