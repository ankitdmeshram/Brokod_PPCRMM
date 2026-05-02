const { getDb } = require("../config/database");

const projectSelectColumns = [
  "projects.id",
  "projects.workspace_id",
  "projects.project_name",
  "projects.project_owner",
  "projects.description",
  "projects.status",
  "projects.start_date",
  "projects.end_date",
  "projects.tags",
  "projects.created_at",
  "projects.created_by",
  "projects.updated_at",
  "projects.deleted_at",
  "projects.deleted_by",
  "workspaces.workspace_name",
  "workspaces.slug as workspace_slug",
];

const create = async ({
  workspaceId,
  projectName,
  projectOwner,
  description,
  status,
  startDate,
  endDate,
  tags,
  createdBy,
}, trx = getDb()) => {
  const result = await trx("projects").insert({
    workspace_id: workspaceId,
    project_name: projectName,
    project_owner: projectOwner,
    description,
    status,
    start_date: startDate,
    end_date: endDate,
    tags: JSON.stringify(tags),
    created_by: createdBy,
  });

  return result[0];
};

const findById = async (id, trx = getDb()) => {
  return trx("projects")
    .leftJoin("workspaces", "workspaces.id", "projects.workspace_id")
    .select(projectSelectColumns)
    .where("projects.id", id)
    .whereNull("projects.deleted_at")
    .first();
};

const applyProjectFilters = (query, filters = {}) => {
  if (filters.workspaceId) {
    query.andWhere("projects.workspace_id", filters.workspaceId);
  }

  if (filters.search) {
    query.andWhere((builder) => {
      const likeSearch = `%${filters.search}%`;

      builder
        .whereRaw("CAST(projects.id AS CHAR) like ?", [likeSearch])
        .orWhereRaw("CAST(projects.project_owner AS CHAR) like ?", [likeSearch])
        .orWhere("projects.project_name", "like", likeSearch)
        .orWhere("projects.description", "like", likeSearch)
        .orWhere("projects.status", "like", likeSearch)
        .orWhere("projects.tags", "like", likeSearch)
        .orWhere("workspaces.workspace_name", "like", likeSearch);
    });
  }

  return query;
};

const findAll = async (filters = {}, trx = getDb()) => {
  const query = trx("projects")
    .leftJoin("workspaces", "workspaces.id", "projects.workspace_id")
    .select(projectSelectColumns)
    .whereNull("projects.deleted_at");

  applyProjectFilters(query, filters);

  if (filters.limit) {
    query.limit(filters.limit);
  }

  if (filters.offset) {
    query.offset(filters.offset);
  }

  return query.orderBy("projects.created_at", "desc");
};

const findAllByUserId = async (userId, filters = {}, trx = getDb()) => {
  const query = trx("projects")
    .join("project_users", "project_users.project_id", "projects.id")
    .leftJoin("workspaces", "workspaces.id", "projects.workspace_id")
    .select(
      ...projectSelectColumns,
      "project_users.role as membership_role",
      "project_users.status as membership_status"
    )
    .where("project_users.user_id", userId)
    .whereNull("projects.deleted_at");

  applyProjectFilters(query, filters);

  if (filters.limit) {
    query.limit(filters.limit);
  }

  if (filters.offset) {
    query.offset(filters.offset);
  }

  return query.orderBy("projects.created_at", "desc");
};

const countAll = async (filters = {}, trx = getDb()) => {
  const query = trx("projects")
    .leftJoin("workspaces", "workspaces.id", "projects.workspace_id")
    .whereNull("projects.deleted_at")
    .countDistinct({ count: "projects.id" })
    .first();

  applyProjectFilters(query, filters);

  const result = await query;
  return Number(result?.count || 0);
};

const countAllByUserId = async (userId, filters = {}, trx = getDb()) => {
  const query = trx("projects")
    .join("project_users", "project_users.project_id", "projects.id")
    .leftJoin("workspaces", "workspaces.id", "projects.workspace_id")
    .where("project_users.user_id", userId)
    .whereNull("projects.deleted_at")
    .countDistinct({ count: "projects.id" })
    .first();

  applyProjectFilters(query, filters);

  const result = await query;
  return Number(result?.count || 0);
};

const findByIdForUser = async (projectId, userId, trx = getDb()) => {
  return trx("projects")
    .join("project_users", "project_users.project_id", "projects.id")
    .leftJoin("workspaces", "workspaces.id", "projects.workspace_id")
    .select(
      ...projectSelectColumns,
      "project_users.role as membership_role",
      "project_users.status as membership_status"
    )
    .where("projects.id", projectId)
    .andWhere("project_users.user_id", userId)
    .whereNull("projects.deleted_at")
    .first();
};

const updateById = async (id, updates, trx = getDb()) => {
  const mappedUpdates = {};

  if (updates.projectName !== undefined) {
    mappedUpdates.project_name = updates.projectName;
  }

  if (updates.workspaceId !== undefined) {
    mappedUpdates.workspace_id = updates.workspaceId;
  }

  if (updates.description !== undefined) {
    mappedUpdates.description = updates.description;
  }

  if (updates.status !== undefined) {
    mappedUpdates.status = updates.status;
  }

  if (updates.startDate !== undefined) {
    mappedUpdates.start_date = updates.startDate;
  }

  if (updates.endDate !== undefined) {
    mappedUpdates.end_date = updates.endDate;
  }

  if (updates.tags !== undefined) {
    mappedUpdates.tags = JSON.stringify(updates.tags);
  }

  return trx("projects").where({ id }).whereNull("deleted_at").update(mappedUpdates);
};

const softDeleteById = async (id, deletedBy, trx = getDb()) => {
  return trx("projects").where({ id }).whereNull("deleted_at").update({
    deleted_at: trx.fn.now(),
    deleted_by: deletedBy,
  });
};

module.exports = {
  countAll,
  countAllByUserId,
  create,
  findAll,
  findAllByUserId,
  findById,
  findByIdForUser,
  softDeleteById,
  updateById,
};
