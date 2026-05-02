const { getDb } = require("../config/database");

const taskSelectColumns = [
  "tasks.id",
  "tasks.project_id",
  "tasks.workspace_id",
  "tasks.title",
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

const buildTaskBaseQuery = (trx = getDb()) =>
  trx("tasks")
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
      trx("task_comments")
        .count("*")
        .whereRaw("task_comments.task_id = tasks.id")
        .as("comments_count"),
      trx("task_activity_logs")
        .count("*")
        .whereRaw("task_activity_logs.task_id = tasks.id")
        .as("activity_logs_count")
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
    const likeSearch = `%${filters.search}%`;

    query.andWhere((builder) => {
      builder
        .whereRaw("CAST(tasks.id AS CHAR) like ?", [likeSearch])
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

  return query;
};

const create = async (
  {
    projectId,
    workspaceId,
    title,
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
    workspace_id: workspaceId,
    title,
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

const findAll = async (filters = {}, trx = getDb()) => {
  const query = buildTaskBaseQuery(trx);

  applyTaskFilters(query, filters);

  if (filters.limit) {
    query.limit(filters.limit);
  }

  if (filters.offset) {
    query.offset(filters.offset);
  }

  return query.orderBy("tasks.created_at", "desc");
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
  softDeleteById,
  updateById,
};
