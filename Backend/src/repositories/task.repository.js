const { getDb } = require("../config/database");

const taskSelectColumns = [
  "tasks.id",
  "tasks.project_id",
  "tasks.project_task_number",
  "tasks.parent_task_id",
  "tasks.workspace_id",
  "tasks.title",
  "tasks.slug",
  "tasks.description",
  "tasks.status",
  "tasks.priority",
  "tasks.assigned_by",
  "tasks.assigned_to",
  "tasks.created_by",
  "tasks.start_date",
  "tasks.due_date",
  "tasks.completed_at",
  "tasks.task_type",
  "tasks.tags",
  "tasks.created_at",
  "tasks.updated_at",
  "tasks.deleted_at",
  "tasks.deleted_by",
];

const advancedTaskFilterColumns = {
  id: { column: "tasks.id", type: "number" },
  projectId: { column: "tasks.project_id", type: "number" },
  projectTaskNumber: { column: "tasks.project_task_number", type: "number" },
  parentTaskId: { column: "tasks.parent_task_id", type: "number" },
  workspaceId: { column: "tasks.workspace_id", type: "number" },
  title: { column: "tasks.title", type: "string" },
  slug: { column: "tasks.slug", type: "string" },
  description: { column: "tasks.description", type: "string" },
  status: { column: "tasks.status", type: "string" },
  priority: { column: "tasks.priority", type: "string" },
  taskType: { column: "tasks.task_type", type: "string" },
  assignedBy: { column: "tasks.assigned_by", type: "number" },
  assignedTo: { column: "tasks.assigned_to", type: "number" },
  createdBy: { column: "tasks.created_by", type: "number" },
  startDate: { column: "tasks.start_date", type: "date" },
  dueDate: { column: "tasks.due_date", type: "date" },
  completedAt: { column: "tasks.completed_at", type: "date" },
  createdAt: { column: "tasks.created_at", type: "date" },
  updatedAt: { column: "tasks.updated_at", type: "date" },
};

const taskSortColumns = {
  id: "tasks.project_task_number",
  title: "tasks.title",
  status: "tasks.status",
  priority: "tasks.priority",
  dueDate: "tasks.due_date",
};

const buildTaskBaseQuery = (trx = getDb()) =>
  trx("tasks")
    .leftJoin({ parent_task: "tasks" }, "parent_task.id", "tasks.parent_task_id")
    .leftJoin({ assigned_by_user: "users" }, "assigned_by_user.id", "tasks.assigned_by")
    .leftJoin({ assigned_to_user: "users" }, "assigned_to_user.id", "tasks.assigned_to")
    .leftJoin({ created_by_user: "users" }, "created_by_user.id", "tasks.created_by")
    .select(
      ...taskSelectColumns,
      "assigned_by_user.first_name as assigned_by_first_name",
      "assigned_by_user.last_name as assigned_by_last_name",
      "assigned_by_user.email as assigned_by_email",
      "assigned_to_user.first_name as assigned_to_first_name",
      "assigned_to_user.last_name as assigned_to_last_name",
      "assigned_to_user.email as assigned_to_email",
      "created_by_user.first_name as created_by_first_name",
      "created_by_user.last_name as created_by_last_name",
      "created_by_user.email as created_by_email",
      "parent_task.title as parent_task_title",
      "parent_task.slug as parent_task_slug",
      "parent_task.project_task_number as parent_task_project_task_number",
      trx("task_comments")
        .count("*")
        .whereRaw("task_comments.task_id = tasks.id")
        .as("comments_count"),
      trx("task_activity_logs")
        .count("*")
        .whereRaw("task_activity_logs.task_id = tasks.id")
        .as("activity_logs_count"),
      trx("tasks as child_tasks")
        .count("*")
        .whereRaw("child_tasks.parent_task_id = tasks.id")
        .whereNull("child_tasks.deleted_at")
        .as("subtasks_count")
    )
    .whereNull("tasks.deleted_at");

const applyTaskFilters = (query, filters = {}) => {
  if (filters.projectId) {
    query.andWhere("tasks.project_id", filters.projectId);
  }

  if (filters.workspaceId) {
    query.andWhere("tasks.workspace_id", filters.workspaceId);
  }

  if (filters.search) {
    const rawSearch = String(filters.search).trim();
    const likeSearch = `%${rawSearch}%`;
    const taskCodeMatch = rawSearch.match(/^tsk-\s*(.+)$/i);
    const likeProjectTaskNumber = taskCodeMatch
      ? `%${taskCodeMatch[1].trim()}%`
      : likeSearch;

    query.andWhere((builder) => {
      builder
        .whereRaw("CAST(tasks.id AS CHAR) like ?", [likeSearch])
        .orWhereRaw("CAST(tasks.project_task_number AS CHAR) like ?", [likeProjectTaskNumber])
        .orWhereRaw("CAST(tasks.project_id AS CHAR) like ?", [likeSearch])
        .orWhereRaw("CAST(tasks.workspace_id AS CHAR) like ?", [likeSearch])
        .orWhere("tasks.title", "like", likeSearch)
        .orWhere("tasks.description", "like", likeSearch)
        .orWhere("tasks.status", "like", likeSearch)
        .orWhere("tasks.priority", "like", likeSearch)
        .orWhere("tasks.task_type", "like", likeSearch)
        .orWhere("tasks.tags", "like", likeSearch)
        .orWhere("assigned_by_user.first_name", "like", likeSearch)
        .orWhere("assigned_by_user.last_name", "like", likeSearch)
        .orWhere("assigned_to_user.first_name", "like", likeSearch)
        .orWhere("assigned_to_user.last_name", "like", likeSearch)
        .orWhere("created_by_user.first_name", "like", likeSearch)
        .orWhere("created_by_user.last_name", "like", likeSearch);
    });
  }

  if (filters.id) {
    const rawFilterValue = String(filters.id).trim();
    const normalizedTaskCode = rawFilterValue.toLowerCase().startsWith("tsk-")
      ? rawFilterValue.slice(4).trim()
      : rawFilterValue;
    const likeId = `%${normalizedTaskCode}%`;

    query.andWhere((builder) => {
      builder
        .whereRaw("CAST(tasks.id AS CHAR) like ?", [likeId])
        .orWhereRaw("CAST(tasks.project_task_number AS CHAR) like ?", [likeId]);
    });
  }

  if (filters.title) {
    query.andWhere("tasks.title", "like", `%${filters.title}%`);
  }

  if (filters.status) {
    query.andWhere("tasks.status", filters.status);
  }

  if (filters.priority) {
    query.andWhere("tasks.priority", filters.priority);
  }

  if (filters.dueDate) {
    query.andWhereRaw("DATE(tasks.due_date) = DATE(?)", [filters.dueDate]);
  }

  if (filters.assignedTo) {
    const likeAssignedTo = `%${filters.assignedTo}%`;

    query.andWhere((builder) => {
      builder
        .where("assigned_to_user.first_name", "like", likeAssignedTo)
        .orWhere("assigned_to_user.last_name", "like", likeAssignedTo)
        .orWhereRaw("TRIM(CONCAT(COALESCE(assigned_to_user.first_name, ''), ' ', COALESCE(assigned_to_user.last_name, ''))) like ?", [likeAssignedTo])
        .orWhere("assigned_to_user.email", "like", likeAssignedTo);
    });
  }

  if (filters.assignedBy) {
    const likeAssignedBy = `%${filters.assignedBy}%`;

    query.andWhere((builder) => {
      builder
        .where("assigned_by_user.first_name", "like", likeAssignedBy)
        .orWhere("assigned_by_user.last_name", "like", likeAssignedBy)
        .orWhereRaw("TRIM(CONCAT(COALESCE(assigned_by_user.first_name, ''), ' ', COALESCE(assigned_by_user.last_name, ''))) like ?", [likeAssignedBy])
        .orWhere("assigned_by_user.email", "like", likeAssignedBy);
    });
  }

  if (filters.tags) {
    query.andWhere("tasks.tags", "like", `%${filters.tags}%`);
  }

  if (filters.updatedAt) {
    query.andWhereRaw("DATE(tasks.updated_at) = DATE(?)", [filters.updatedAt]);
  }

  if (filters.createdAt) {
    query.andWhereRaw("DATE(tasks.created_at) = DATE(?)", [filters.createdAt]);
  }

  return query;
};

const applyAdvancedTaskFilters = (query, advancedFilters = []) => {
  const operatorMap = {
    eq: "=",
    neq: "!=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<=",
  };

  advancedFilters.forEach((filter) => {
    const filterConfig = advancedTaskFilterColumns[filter.field];

    if (!filterConfig) {
      return;
    }

    if (filterConfig.type === "string") {
      if (filter.operator === "starts_with") {
        query.andWhere(filterConfig.column, "like", `${filter.value}%`);
        return;
      }

      if (filter.operator === "ends_with") {
        query.andWhere(filterConfig.column, "like", `%${filter.value}`);
        return;
      }

      if (filter.operator === "contains") {
        query.andWhere(filterConfig.column, "like", `%${filter.value}%`);
        return;
      }

      query.andWhere(filterConfig.column, operatorMap[filter.operator], filter.value);
      return;
    }

    if (filterConfig.type === "number") {
      query.andWhere(filterConfig.column, operatorMap[filter.operator], filter.value);
      return;
    }

    if (filterConfig.type === "date") {
      query.andWhereRaw(`DATE(${filterConfig.column}) ${operatorMap[filter.operator]} DATE(?)`, [
        filter.value,
      ]);
      return;
    }

    if (filterConfig.type === "boolean") {
      query.andWhere(filterConfig.column, operatorMap[filter.operator], filter.value);
    }
  });

  return query;
};

const create = async (
  {
    projectId,
    workspaceId,
    projectTaskNumber,
    parentTaskId,
    title,
    slug,
    description,
    status,
    priority,
    assignedBy,
    assignedTo,
    createdBy,
    startDate,
    dueDate,
    completedAt,
    taskType,
    tags,
  },
  trx = getDb()
) => {
  const result = await trx("tasks").insert({
    project_id: projectId,
    project_task_number: projectTaskNumber,
    parent_task_id: parentTaskId,
    workspace_id: workspaceId,
    title,
    slug,
    description,
    status,
    priority,
    assigned_by: assignedBy,
    assigned_to: assignedTo,
    created_by: createdBy,
    start_date: startDate,
    due_date: dueDate,
    completed_at: completedAt,
    task_type: taskType,
    tags: JSON.stringify(tags),
  });

  return result[0];
};

const findById = async (id, trx = getDb()) =>
  buildTaskBaseQuery(trx).where("tasks.id", id).first();

const findBySlug = async (slug, projectId = null, trx = getDb()) => {
  const query = buildTaskBaseQuery(trx).where("tasks.slug", slug);

  if (projectId !== null && projectId !== undefined) {
    query.andWhere("tasks.project_id", projectId);
  }

  return query.first();
};

const getNextProjectTaskNumber = async (projectId, trx = getDb()) => {
  const latestTask = await trx("tasks")
    .select("project_task_number")
    .where("project_id", projectId)
    .whereNull("deleted_at")
    .orderBy("project_task_number", "desc")
    .forUpdate()
    .first();

  return Number(latestTask?.project_task_number || 0) + 1;
};

const findAll = async (filters = {}, trx = getDb()) => {
  const query = buildTaskBaseQuery(trx);
  const sortRules = Array.isArray(filters.sortRules) ? filters.sortRules : [];

  applyTaskFilters(query, filters);
  applyAdvancedTaskFilters(query, filters.advancedFilters);

  if (filters.limit) {
    query.limit(filters.limit);
  }

  if (filters.offset) {
    query.offset(filters.offset);
  }

  sortRules.forEach(({ field, order }) => {
    if (field === "assignedTo") {
      query.orderByRaw(
        `LOWER(TRIM(CONCAT(COALESCE(assigned_to_user.first_name, ''), ' ', COALESCE(assigned_to_user.last_name, '')))) ${order}`
      );
    } else if (field === "assignedBy") {
      query.orderByRaw(
        `LOWER(TRIM(CONCAT(COALESCE(assigned_by_user.first_name, ''), ' ', COALESCE(assigned_by_user.last_name, '')))) ${order}`
      );
    } else {
      query.orderBy(taskSortColumns[field], order);
    }
  });

  if (sortRules.length === 0) {
    query.orderBy("tasks.created_at", "desc");
  }

  if (!sortRules.some(({ field }) => field === "id")) {
    query.orderBy("tasks.id", "desc");
  }

  return query;
};

const countAll = async (filters = {}, trx = getDb()) => {
  const query = trx("tasks")
    .leftJoin({ assigned_by_user: "users" }, "assigned_by_user.id", "tasks.assigned_by")
    .leftJoin({ assigned_to_user: "users" }, "assigned_to_user.id", "tasks.assigned_to")
    .leftJoin({ created_by_user: "users" }, "created_by_user.id", "tasks.created_by")
    .whereNull("tasks.deleted_at")
    .countDistinct({ count: "tasks.id" })
    .first();

  applyTaskFilters(query, filters);
  applyAdvancedTaskFilters(query, filters.advancedFilters);

  const result = await query;
  return Number(result?.count || 0);
};

const softDeleteById = async (id, deletedBy, trx = getDb()) =>
  trx("tasks").where({ id }).whereNull("deleted_at").update({
    deleted_at: trx.fn.now(),
    deleted_by: deletedBy,
  });

const updateById = async (id, updates, trx = getDb()) =>
  trx("tasks").where({ id }).whereNull("deleted_at").update({
    title: updates.title,
    slug: updates.slug,
    parent_task_id: updates.parentTaskId,
    description: updates.description,
    status: updates.status,
    priority: updates.priority,
    assigned_by: updates.assignedBy,
    assigned_to: updates.assignedTo,
    start_date: updates.startDate,
    due_date: updates.dueDate,
    completed_at: updates.completedAt,
    task_type: updates.taskType,
    tags: JSON.stringify(updates.tags),
  });

module.exports = {
  countAll,
  create,
  findAll,
  findById,
  findBySlug,
  getNextProjectTaskNumber,
  softDeleteById,
  updateById,
};
