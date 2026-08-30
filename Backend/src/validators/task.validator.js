const AppError = require("../utils/app-error");
const { compareUtc, formatUtcDate, isValidDateTime, toUtcMoment } = require("../utils/time");

const allowedStatuses = new Set(["todo", "in_progress", "review", "done", "blocked"]);
const allowedPriorities = new Set(["low", "medium", "high", "critical"]);
const allowedTaskTypes = new Set(["feature", "bug", "improvement", "research"]);
const stringFilterOperators = new Set(["starts_with", "ends_with", "contains", "eq", "neq"]);
const comparableFilterOperators = new Set(["eq", "neq", "gt", "lt", "gte", "lte"]);
const booleanFilterOperators = new Set(["eq", "neq"]);
const allowedTaskSortFields = new Set([
  "id",
  "title",
  "project",
  "status",
  "priority",
  "dueDate",
  "assignedTo",
  "assignedBy",
]);
const allowedSortOrders = new Set(["asc", "desc"]);
const MAX_TASK_TITLE_LENGTH = 500;
const MAX_TASK_COMMENT_LENGTH = 10000;
const MAX_BULK_TASKS = 500;
const bulkEditableTaskFields = new Set([
  "title",
  "description",
  "status",
  "priority",
  "taskType",
  "parentTaskId",
  "assignedBy",
  "assignedTo",
  "startDate",
  "dueDate",
  "completedAt",
  "tags",
]);

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
  if (value && !isValidDateTime(value)) {
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

  const parsedDate = toUtcMoment(normalizedValue);

  if (!parsedDate.isValid()) {
    throw new AppError(`Please provide a valid ${label}.`, 400);
  }

  return formatUtcDate(parsedDate);
};

const normalizeOptionalString = (value) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || "";
};

const normalizeTaskSortRules = ({ sort, sortBy, sortOrder }) => {
  const normalizedSort = normalizeOptionalString(sort);
  const legacySortBy = normalizeOptionalString(sortBy);
  const legacySortOrder = normalizeOptionalString(sortOrder).toLowerCase();

  if (!normalizedSort) {
    if (legacySortBy && !allowedTaskSortFields.has(legacySortBy)) {
      throw new AppError(
        `sortBy must be one of: ${[...allowedTaskSortFields].join(", ")}.`,
        400
      );
    }

    if (legacySortBy && !allowedSortOrders.has(legacySortOrder)) {
      throw new AppError("sortOrder must be either asc or desc when sortBy is provided.", 400);
    }

    if (!legacySortBy && legacySortOrder) {
      throw new AppError("sortBy is required when sortOrder is provided.", 400);
    }

    return legacySortBy ? [{ field: legacySortBy, order: legacySortOrder }] : [];
  }

  const rules = normalizedSort.split(",").map((entry) => {
    const [field, order, ...extraParts] = entry.split(":").map((part) => part.trim());

    if (extraParts.length > 0 || !allowedTaskSortFields.has(field)) {
      throw new AppError(
        `sort fields must be one of: ${[...allowedTaskSortFields].join(", ")}.`,
        400
      );
    }

    const normalizedOrder = String(order || "").toLowerCase();

    if (!allowedSortOrders.has(normalizedOrder)) {
      throw new AppError("Each sort rule must use asc or desc, for example dueDate:asc.", 400);
    }

    return { field, order: normalizedOrder };
  });

  if (rules.length > allowedTaskSortFields.size) {
    throw new AppError(`A maximum of ${allowedTaskSortFields.size} sort rules is allowed.`, 400);
  }

  if (new Set(rules.map((rule) => rule.field)).size !== rules.length) {
    throw new AppError("Each task column may only appear once in sort.", 400);
  }

  return rules;
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

const MAX_CUSTOM_FIELD_VALUES = 50;

// Custom field ids are resolved/validated against the project's live field
// list at render time, not here, so this only guards against malformed
// shapes (non-object payloads, non-numeric keys, oversized objects).
const normalizeCustomFieldValues = (rawValues) => {
  if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
    return {};
  }

  const normalized = {};

  Object.entries(rawValues)
    .slice(0, MAX_CUSTOM_FIELD_VALUES)
    .forEach(([key, value]) => {
      if (!/^\d+$/.test(String(key))) {
        return;
      }

      if (value === null || typeof value === "boolean") {
        normalized[key] = value;
        return;
      }

      if (typeof value === "string" || typeof value === "number") {
        normalized[key] = String(value);
      }
    });

  return normalized;
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
  const customFieldValues = normalizeCustomFieldValues(payload?.customFieldValues);

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
    customFieldValues,
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
    customFieldValues,
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

  if (title.length > MAX_TASK_TITLE_LENGTH) {
    throw new AppError(`title must be ${MAX_TASK_TITLE_LENGTH} characters or fewer.`, 400);
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

  if (startDate && completedAt && compareUtc(completedAt, startDate) < 0) {
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
    customFieldValues,
    initialComment,
    initialActivityLog,
  };
};

const validateUpdateTaskPayload = (payload) => {
  const normalizedPayload = normalizeTaskPayload(payload);

  if (!normalizedPayload.title) {
    throw new AppError("title is required.", 400);
  }

  if (normalizedPayload.title.length > MAX_TASK_TITLE_LENGTH) {
    throw new AppError(`title must be ${MAX_TASK_TITLE_LENGTH} characters or fewer.`, 400);
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
    normalizedPayload.completedAt &&
    compareUtc(normalizedPayload.completedAt, normalizedPayload.startDate) < 0
  ) {
    throw new AppError("completedAt cannot be earlier than startDate.", 400);
  }

  return normalizedPayload;
};

const validateBulkUpdateTasksPayload = (payload = {}) => {
  const rawProjectId = payload?.projectId;
  const projectId =
    rawProjectId === undefined || rawProjectId === null || rawProjectId === ""
      ? null
      : Number(rawProjectId);
  const taskIds = Array.isArray(payload?.taskIds)
    ? [...new Set(payload.taskIds.map(Number))]
    : [];
  const updates = payload?.updates;

  if (projectId !== null && (!Number.isInteger(projectId) || projectId <= 0)) {
    throw new AppError("projectId must be a valid integer when provided.", 400);
  }

  if (
    taskIds.length === 0 ||
    taskIds.length > MAX_BULK_TASKS ||
    taskIds.some((taskId) => !Number.isInteger(taskId) || taskId <= 0)
  ) {
    throw new AppError(`taskIds must contain between 1 and ${MAX_BULK_TASKS} valid task ids.`, 400);
  }

  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new AppError("updates must be an object.", 400);
  }

  const updateFields = Object.keys(updates);

  if (updateFields.length === 0) {
    throw new AppError("Please provide at least one task field to update.", 400);
  }

  const unsupportedField = updateFields.find((field) => !bulkEditableTaskFields.has(field));

  if (unsupportedField) {
    throw new AppError(`${unsupportedField} cannot be updated in bulk.`, 400);
  }

  return { projectId, taskIds, updates };
};

const validateGetTasksFilters = (filters = {}) => {
  const rawProjectId = filters?.projectId;
  const projectId =
    rawProjectId === undefined || rawProjectId === null || rawProjectId === ""
      ? null
      : Number(rawProjectId);
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
  const sortRules = normalizeTaskSortRules({
    sort: filters?.sort,
    sortBy: filters?.sortBy,
    sortOrder: filters?.sortOrder,
  });

  if (projectId !== null && (!Number.isInteger(projectId) || projectId <= 0)) {
    throw new AppError("projectId must be a valid integer when provided.", 400);
  }

  if (workspaceId !== null && (!Number.isInteger(workspaceId) || workspaceId <= 0)) {
    throw new AppError("workspaceId must be a valid integer when provided.", 400);
  }

  if (projectId === null && workspaceId === null) {
    throw new AppError("Please provide either a projectId or a workspaceId.", 400);
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
    sortRules,
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

// A drop is described by the two tasks it landed between, not by a numeric
// index. Neighbour ids stay correct while the list is paginated or filtered,
// and let the server resolve real ranks under a lock.
const validateReorderTaskPayload = (payload = {}) => {
  const normalizeNeighbourId = (value, label) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new AppError(`${label} must be a valid task id when provided.`, 400);
    }

    return normalizedValue;
  };

  const beforeTaskId = normalizeNeighbourId(payload?.beforeTaskId, "beforeTaskId");
  const afterTaskId = normalizeNeighbourId(payload?.afterTaskId, "afterTaskId");

  if (beforeTaskId !== null && beforeTaskId === afterTaskId) {
    throw new AppError("beforeTaskId and afterTaskId must be different tasks.", 400);
  }

  const status = normalizeOptionalString(payload?.status).toLowerCase();

  if (status && !allowedStatuses.has(status)) {
    throw new AppError(`status must be one of: ${[...allowedStatuses].join(", ")}.`, 400);
  }

  return {
    beforeTaskId,
    afterTaskId,
    status: status || null,
  };
};

const validateTaskId = (taskId) => {
  const normalizedTaskId = Number(taskId);

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    throw new AppError("Please provide a valid task id.", 400);
  }

  return normalizedTaskId;
};

const stripHtmlTags = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const validateCreateTaskCommentPayload = (payload = {}) => {
  const comment = String(payload?.comment || "").trim();
  const plainTextComment = stripHtmlTags(comment);

  if (!plainTextComment) {
    throw new AppError("comment is required.", 400);
  }

  if (plainTextComment.length > MAX_TASK_COMMENT_LENGTH) {
    throw new AppError(`comment must be ${MAX_TASK_COMMENT_LENGTH} characters or fewer.`, 400);
  }

  return {
    comment,
  };
};

module.exports = {
  validateBulkUpdateTasksPayload,
  validateCreateTaskCommentPayload,
  validateCreateTaskPayload,
  validateExportTasksFilters,
  validateGetTasksFilters,
  validateImportTasksPayload,
  validateReorderTaskPayload,
  validateTaskId,
  validateUpdateTaskPayload,
};
