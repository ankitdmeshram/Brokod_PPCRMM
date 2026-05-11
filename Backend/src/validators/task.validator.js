const AppError = require("../utils/app-error");

const allowedStatuses = new Set(["todo", "in_progress", "review", "done", "blocked"]);
const allowedPriorities = new Set(["low", "medium", "high", "critical"]);
const allowedTaskTypes = new Set(["feature", "bug", "improvement", "research"]);
const stringFilterOperators = new Set(["starts_with", "ends_with", "contains", "eq", "neq"]);
const comparableFilterOperators = new Set(["eq", "neq", "gt", "lt", "gte", "lte"]);
const booleanFilterOperators = new Set(["eq", "neq"]);

const advancedTaskFilterFields = {
  id: { type: "number" },
  projectId: { type: "number" },
  projectTaskNumber: { type: "number" },
  parentTaskId: { type: "number" },
  workspaceId: { type: "number" },
  title: { type: "string" },
  slug: { type: "string" },
  description: { type: "string" },
  status: { type: "string", normalize: (value) => value.toLowerCase() },
  priority: { type: "string", normalize: (value) => value.toLowerCase() },
  taskType: { type: "string", normalize: (value) => value.toLowerCase() },
  assignedBy: { type: "number" },
  assignedTo: { type: "number" },
  createdBy: { type: "number" },
  startDate: { type: "date" },
  dueDate: { type: "date" },
  completedAt: { type: "date" },
  createdAt: { type: "date" },
  updatedAt: { type: "date" },
};

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

const normalizeOptionalDateValue = (value, label) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return null;
  }

  validateDateValue(label, normalizedValue);

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(`Please provide a valid ${label}.`, 400);
  }

  return parsedDate.toISOString().slice(0, 10);
};

const normalizeOptionalString = (value) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || "";
};

const normalizeOptionalInteger = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue)) {
    return Number.NaN;
  }

  return normalizedValue;
};

const normalizeOptionalDateFilter = (value, label) => {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return "";
  }

  validateDateValue(label, normalizedValue);
  return normalizedValue;
};

const normalizeAdvancedFilterOperator = (operator) => {
  const normalizedOperator = String(operator || "").trim().toLowerCase();

  const operatorAliases = {
    "=": "eq",
    "==": "eq",
    "!=": "neq",
    ">": "gt",
    "<": "lt",
    ">=": "gte",
    "<=": "lte",
    startswith: "starts_with",
    "starts with": "starts_with",
    endswith: "ends_with",
    "ends with": "ends_with",
  };

  return operatorAliases[normalizedOperator] || normalizedOperator;
};

const normalizeBooleanValue = (value, label) => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value || "").trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new AppError(`Please provide a valid boolean value for ${label}.`, 400);
};

const normalizeAdvancedFilterValue = (field, fieldConfig, value, operator) => {
  const label = `advancedFilters.${field}`;

  if (fieldConfig.type === "string") {
    if (!stringFilterOperators.has(operator)) {
      throw new AppError(
        `${field} supports starts_with, ends_with, contains, eq, and neq operators.`,
        400
      );
    }

    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      throw new AppError(`Please provide a value for ${field}.`, 400);
    }

    return fieldConfig.normalize ? fieldConfig.normalize(normalizedValue) : normalizedValue;
  }

  if (fieldConfig.type === "number") {
    if (!comparableFilterOperators.has(operator)) {
      throw new AppError(
        `${field} supports eq, neq, gt, lt, gte, and lte operators.`,
        400
      );
    }

    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue)) {
      throw new AppError(`Please provide a valid numeric value for ${field}.`, 400);
    }

    return normalizedValue;
  }

  if (fieldConfig.type === "date") {
    if (!comparableFilterOperators.has(operator)) {
      throw new AppError(
        `${field} supports eq, neq, gt, lt, gte, and lte operators.`,
        400
      );
    }

    const normalizedValue = normalizeOptionalDateValue(value, label);

    if (!normalizedValue) {
      throw new AppError(`Please provide a valid date value for ${field}.`, 400);
    }

    return normalizedValue;
  }

  if (fieldConfig.type === "boolean") {
    if (!booleanFilterOperators.has(operator)) {
      throw new AppError(`${field} supports eq and neq operators.`, 400);
    }

    return normalizeBooleanValue(value, label);
  }

  throw new AppError(`Unsupported advanced filter field: ${field}.`, 400);
};

const normalizeAdvancedFilters = (advancedFilters) => {
  if (advancedFilters === undefined || advancedFilters === null || advancedFilters === "") {
    return [];
  }

  let parsedFilters = advancedFilters;

  if (typeof parsedFilters === "string") {
    try {
      parsedFilters = JSON.parse(parsedFilters);
    } catch {
      throw new AppError("advancedFilters must be a valid JSON array.", 400);
    }
  }

  if (!Array.isArray(parsedFilters)) {
    throw new AppError("advancedFilters must be an array.", 400);
  }

  return parsedFilters.map((filter, index) => {
    const field = String(filter?.field || "").trim();
    const operator = normalizeAdvancedFilterOperator(filter?.operator);

    if (!field) {
      throw new AppError(`advancedFilters[${index}].field is required.`, 400);
    }

    if (!operator) {
      throw new AppError(`advancedFilters[${index}].operator is required.`, 400);
    }

    const fieldConfig = advancedTaskFilterFields[field];

    if (!fieldConfig) {
      throw new AppError(`advancedFilters[${index}].field is not supported.`, 400);
    }

    return {
      field,
      operator,
      value: normalizeAdvancedFilterValue(field, fieldConfig, filter?.value, operator),
    };
  });
};

const normalizeTaskPayload = (payload = {}) => {
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const status = String(payload?.status || "todo").trim().toLowerCase();
  const priority = String(payload?.priority || "medium").trim().toLowerCase();
  const taskType = String(payload?.taskType || "feature").trim().toLowerCase();
  const parentTaskId = normalizeOptionalInteger(payload?.parentTaskId);
  const assignedBy =
    payload?.assignedBy === undefined || payload?.assignedBy === null || payload?.assignedBy === ""
      ? null
      : Number(payload.assignedBy);
  const assignedTo =
    payload?.assignedTo === undefined || payload?.assignedTo === null || payload?.assignedTo === ""
      ? null
      : Number(payload.assignedTo);
  const startDate = normalizeOptionalDateValue(payload?.startDate, "startDate");
  const dueDate = normalizeOptionalDateValue(payload?.dueDate, "dueDate");
  const completedAt = normalizeOptionalDateValue(
    payload?.completedAt ?? payload?.completedDate,
    "completedAt"
  );
  const tags = normalizeTags(payload?.tags);

  return {
    title,
    description,
    status,
    priority,
    taskType,
    parentTaskId,
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
    parentTaskId,
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

  if (parentTaskId !== null && (!Number.isInteger(parentTaskId) || parentTaskId <= 0)) {
    throw new AppError("parentTaskId must be a valid integer when provided.", 400);
  }

  if (assignedBy !== null && (!Number.isInteger(assignedBy) || assignedBy <= 0)) {
    throw new AppError("assignedBy must be a valid integer when provided.", 400);
  }

  if (assignedTo !== null && (!Number.isInteger(assignedTo) || assignedTo <= 0)) {
    throw new AppError("assignedTo must be a valid integer when provided.", 400);
  }

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
    parentTaskId,
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
    normalizedPayload.parentTaskId !== null &&
    (!Number.isInteger(normalizedPayload.parentTaskId) || normalizedPayload.parentTaskId <= 0)
  ) {
    throw new AppError("parentTaskId must be a valid integer when provided.", 400);
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
  const id = normalizeOptionalString(filters?.id);
  const title = normalizeOptionalString(filters?.title);
  const status = normalizeOptionalString(filters?.status).toLowerCase();
  const priority = normalizeOptionalString(filters?.priority).toLowerCase();
  const dueDate = normalizeOptionalDateFilter(filters?.dueDate, "dueDate");
  const assignedTo = normalizeOptionalString(filters?.assignedTo);
  const assignedBy = normalizeOptionalString(filters?.assignedBy);
  const tags = normalizeOptionalString(filters?.tags);
  const updatedAt = normalizeOptionalDateFilter(filters?.updatedAt, "updatedAt");
  const createdAt = normalizeOptionalDateFilter(filters?.createdAt, "createdAt");
  const advancedFilters = normalizeAdvancedFilters(filters?.advancedFilters);

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

  if (status && !allowedStatuses.has(status)) {
    throw new AppError("status must be one of: todo, in_progress, review, done, blocked.", 400);
  }

  if (priority && !allowedPriorities.has(priority)) {
    throw new AppError("priority must be one of: low, medium, high, critical.", 400);
  }

  return {
    projectId,
    workspaceId,
    search,
    id,
    title,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedBy,
    tags,
    updatedAt,
    createdAt,
    advancedFilters,
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
  const id = normalizeOptionalString(filters?.id);
  const title = normalizeOptionalString(filters?.title);
  const status = normalizeOptionalString(filters?.status).toLowerCase();
  const priority = normalizeOptionalString(filters?.priority).toLowerCase();
  const dueDate = normalizeOptionalDateFilter(filters?.dueDate, "dueDate");
  const assignedTo = normalizeOptionalString(filters?.assignedTo);
  const assignedBy = normalizeOptionalString(filters?.assignedBy);
  const tags = normalizeOptionalString(filters?.tags);
  const updatedAt = normalizeOptionalDateFilter(filters?.updatedAt, "updatedAt");
  const createdAt = normalizeOptionalDateFilter(filters?.createdAt, "createdAt");
  const advancedFilters = normalizeAdvancedFilters(filters?.advancedFilters);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError("projectId is required and must be a valid integer.", 400);
  }

  if (workspaceId !== null && (!Number.isInteger(workspaceId) || workspaceId <= 0)) {
    throw new AppError("workspaceId must be a valid integer when provided.", 400);
  }

  if (status && !allowedStatuses.has(status)) {
    throw new AppError("status must be one of: todo, in_progress, review, done, blocked.", 400);
  }

  if (priority && !allowedPriorities.has(priority)) {
    throw new AppError("priority must be one of: low, medium, high, critical.", 400);
  }

  return {
    projectId,
    workspaceId,
    search,
    id,
    title,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedBy,
    tags,
    updatedAt,
    createdAt,
    advancedFilters,
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
