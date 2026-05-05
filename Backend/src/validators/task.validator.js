const AppError = require("../utils/app-error");

const allowedStatuses = new Set(["todo", "in_progress", "review", "done", "blocked"]);
const allowedPriorities = new Set(["low", "medium", "high", "critical"]);
const allowedTaskTypes = new Set(["feature", "bug", "improvement", "research"]);

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

const validateDateValue = (label, value) => {
  if (value && Number.isNaN(Date.parse(value))) {
    throw new AppError(`Please provide a valid ${label}.`, 400);
  }
};

const normalizeTaskPayload = (payload = {}) => {
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const status = String(payload?.status || "todo").trim().toLowerCase();
  const priority = String(payload?.priority || "medium").trim().toLowerCase();
  const taskType = String(payload?.taskType || "feature").trim().toLowerCase();
  const assignedBy =
    payload?.assignedBy === undefined || payload?.assignedBy === null || payload?.assignedBy === ""
      ? null
      : Number(payload.assignedBy);
  const assignedTo =
    payload?.assignedTo === undefined || payload?.assignedTo === null || payload?.assignedTo === ""
      ? null
      : Number(payload.assignedTo);
  const startDate = payload?.startDate?.trim() || null;
  const dueDate = payload?.dueDate?.trim() || null;
  const completedAt = payload?.completedAt?.trim() || payload?.completedDate?.trim() || null;
  const tags = normalizeTags(payload?.tags);

  return {
    title,
    description,
    status,
    priority,
    taskType,
    assignedBy,
    assignedTo,
    startDate,
    dueDate,
    completedAt,
    tags,
  };
};

const validateCreateTaskPayload = (payload) => {
  const projectId = Number(payload?.projectId);
  const workspaceId = Number(payload?.workspaceId);
  const {
    title,
    description,
    status,
    priority,
    taskType,
    assignedBy,
    assignedTo,
    startDate,
    dueDate,
    completedAt,
    tags,
  } = normalizeTaskPayload(payload);
  const initialComment = String(payload?.initialComment || payload?.comments || "").trim();
  const initialActivityLog = String(payload?.initialActivityLog || payload?.activityLogs || "").trim();

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError("projectId is required and must be a valid integer.", 400);
  }

  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new AppError("workspaceId is required and must be a valid integer.", 400);
  }

  if (!title) {
    throw new AppError("title is required.", 400);
  }

  if (!allowedStatuses.has(status)) {
    throw new AppError("status must be one of: todo, in_progress, review, done, blocked.", 400);
  }

  if (!allowedPriorities.has(priority)) {
    throw new AppError("priority must be one of: low, medium, high, critical.", 400);
  }

  if (!allowedTaskTypes.has(taskType)) {
    throw new AppError("taskType must be one of: feature, bug, improvement, research.", 400);
  }

  if (assignedBy !== null && (!Number.isInteger(assignedBy) || assignedBy <= 0)) {
    throw new AppError("assignedBy must be a valid integer when provided.", 400);
  }

  if (assignedTo !== null && (!Number.isInteger(assignedTo) || assignedTo <= 0)) {
    throw new AppError("assignedTo must be a valid integer when provided.", 400);
  }

  validateDateValue("startDate", startDate);
  validateDateValue("dueDate", dueDate);
  validateDateValue("completedAt", completedAt);

  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new AppError("dueDate cannot be earlier than startDate.", 400);
  }

  if (startDate && completedAt && new Date(completedAt) < new Date(startDate)) {
    throw new AppError("completedAt cannot be earlier than startDate.", 400);
  }

  return {
    projectId,
    workspaceId,
    title,
    description,
    status,
    priority,
    assignedBy,
    assignedTo,
    startDate,
    dueDate,
    completedAt,
    taskType,
    tags,
    initialComment,
    initialActivityLog,
  };
};

const validateUpdateTaskPayload = (payload) => {
  const normalizedPayload = normalizeTaskPayload(payload);

  if (!normalizedPayload.title) {
    throw new AppError("title is required.", 400);
  }

  if (!allowedStatuses.has(normalizedPayload.status)) {
    throw new AppError("status must be one of: todo, in_progress, review, done, blocked.", 400);
  }

  if (!allowedPriorities.has(normalizedPayload.priority)) {
    throw new AppError("priority must be one of: low, medium, high, critical.", 400);
  }

  if (!allowedTaskTypes.has(normalizedPayload.taskType)) {
    throw new AppError("taskType must be one of: feature, bug, improvement, research.", 400);
  }

  if (
    normalizedPayload.assignedBy !== null &&
    (!Number.isInteger(normalizedPayload.assignedBy) || normalizedPayload.assignedBy <= 0)
  ) {
    throw new AppError("assignedBy must be a valid integer when provided.", 400);
  }

  if (
    normalizedPayload.assignedTo !== null &&
    (!Number.isInteger(normalizedPayload.assignedTo) || normalizedPayload.assignedTo <= 0)
  ) {
    throw new AppError("assignedTo must be a valid integer when provided.", 400);
  }

  validateDateValue("startDate", normalizedPayload.startDate);
  validateDateValue("dueDate", normalizedPayload.dueDate);
  validateDateValue("completedAt", normalizedPayload.completedAt);

  if (
    normalizedPayload.startDate &&
    normalizedPayload.dueDate &&
    new Date(normalizedPayload.dueDate) < new Date(normalizedPayload.startDate)
  ) {
    throw new AppError("dueDate cannot be earlier than startDate.", 400);
  }

  if (
    normalizedPayload.startDate &&
    normalizedPayload.completedAt &&
    new Date(normalizedPayload.completedAt) < new Date(normalizedPayload.startDate)
  ) {
    throw new AppError("completedAt cannot be earlier than startDate.", 400);
  }

  return normalizedPayload;
};

const validateGetTasksFilters = (filters = {}) => {
  const projectId = Number(filters?.projectId);
  const workspaceId =
    filters?.workspaceId === undefined || filters?.workspaceId === null || filters?.workspaceId === ""
      ? null
      : Number(filters.workspaceId);
  const page = Number(filters?.page ?? 1);
  const limit = Number(filters?.limit ?? 10);
  const search = String(filters?.search || "").trim();

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError("projectId is required and must be a valid integer.", 400);
  }

  if (workspaceId !== null && (!Number.isInteger(workspaceId) || workspaceId <= 0)) {
    throw new AppError("workspaceId must be a valid integer when provided.", 400);
  }

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError("Please provide a valid page number.", 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError("Please provide a valid limit between 1 and 100.", 400);
  }

  return {
    projectId,
    workspaceId,
    search,
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const validateExportTasksFilters = (filters = {}) => {
  const projectId = Number(filters?.projectId);
  const workspaceId =
    filters?.workspaceId === undefined || filters?.workspaceId === null || filters?.workspaceId === ""
      ? null
      : Number(filters.workspaceId);
  const search = String(filters?.search || "").trim();

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError("projectId is required and must be a valid integer.", 400);
  }

  if (workspaceId !== null && (!Number.isInteger(workspaceId) || workspaceId <= 0)) {
    throw new AppError("workspaceId must be a valid integer when provided.", 400);
  }

  return {
    projectId,
    workspaceId,
    search,
  };
};

const validateImportTasksPayload = (payload = {}) => {
  const projectId = Number(payload?.projectId);
  const workspaceId =
    payload?.workspaceId === undefined || payload?.workspaceId === null || payload?.workspaceId === ""
      ? null
      : Number(payload.workspaceId);
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : null;

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError("projectId is required and must be a valid integer.", 400);
  }

  if (workspaceId !== null && (!Number.isInteger(workspaceId) || workspaceId <= 0)) {
    throw new AppError("workspaceId must be a valid integer when provided.", 400);
  }

  if (!tasks) {
    throw new AppError("The imported file must contain a tasks array.", 400);
  }

  if (tasks.length === 0) {
    throw new AppError("The imported file does not contain any tasks to import.", 400);
  }

  return {
    projectId,
    workspaceId,
    tasks,
  };
};

const validateTaskId = (taskId) => {
  const normalizedTaskId = Number(taskId);

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    throw new AppError("Please provide a valid task id.", 400);
  }

  return normalizedTaskId;
};

module.exports = {
  validateCreateTaskPayload,
  validateExportTasksFilters,
  validateGetTasksFilters,
  validateImportTasksPayload,
  validateTaskId,
  validateUpdateTaskPayload,
};
