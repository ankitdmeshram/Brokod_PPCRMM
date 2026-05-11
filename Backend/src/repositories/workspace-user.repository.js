const { getDb } = require("../config/database");

const create = async ({ workspaceId, userId, role, status, createdBy }, trx = getDb()) => {
  const result = await trx("workspace_users").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
    status,
    created_by: createdBy,
  });

  return result[0];
};

const findByWorkspaceIdAndUserId = async (workspaceId, userId, trx = getDb()) =>
  trx("workspace_users")
    .select(
      "id",
      "workspace_id",
      "user_id",
      "role",
      "status",
      "created_at",
      "created_by",
      "updated_at"
    )
    .where({
      workspace_id: workspaceId,
      user_id: userId,
    })
    .first();

const updateByWorkspaceIdAndUserId = async (
  workspaceId,
  userId,
  updates,
  trx = getDb()
) =>
  trx("workspace_users")
    .where({
      workspace_id: workspaceId,
      user_id: userId,
    })
    .update({
      role: updates.role,
      status: updates.status,
    });

const deleteByWorkspaceIdAndUserId = async (workspaceId, userId, trx = getDb()) =>
  trx("workspace_users")
    .where({
      workspace_id: workspaceId,
      user_id: userId,
    })
    .delete();

const applyWorkspaceUserFilters = (query, filters = {}) => {
  if (filters.search) {
    query.andWhere((builder) => {
      builder
        .where("users.first_name", "like", `%${filters.search}%`)
        .orWhere("users.last_name", "like", `%${filters.search}%`)
        .orWhere("users.email", "like", `%${filters.search}%`)
        .orWhere("users.role", "like", `%${filters.search}%`)
        .orWhere("workspace_users.role", "like", `%${filters.search}%`)
        .orWhere("workspace_users.status", "like", `%${filters.search}%`);
    });
  }

  return query;
};

const findAllByWorkspaceId = async (workspaceId, filters = {}, trx = getDb()) => {
  const query = trx("workspace_users")
    .join("users", "users.id", "workspace_users.user_id")
    .select(
      "workspace_users.id",
      "workspace_users.workspace_id",
      "workspace_users.user_id",
      "workspace_users.role as workspace_role",
      "workspace_users.status as workspace_status",
      "workspace_users.created_at as joined_at",
      "workspace_users.created_by",
      "workspace_users.updated_at",
      "users.first_name",
      "users.last_name",
      "users.email",
      "users.phone",
      "users.last_login",
      "users.is_active",
      "users.role as user_role"
    )
    .where("workspace_users.workspace_id", workspaceId);

  applyWorkspaceUserFilters(query, filters);

  if (filters.limit) {
    query.limit(filters.limit);
  }

  if (filters.offset) {
    query.offset(filters.offset);
  }

  return query.orderBy("workspace_users.created_at", "asc");
};

const countAllByWorkspaceId = async (workspaceId, filters = {}, trx = getDb()) => {
  const query = trx("workspace_users")
    .join("users", "users.id", "workspace_users.user_id")
    .where("workspace_users.workspace_id", workspaceId)
    .count({ count: "*" })
    .first();

  applyWorkspaceUserFilters(query, filters);

  const result = await query;
  return Number(result?.count || 0);
};

module.exports = {
  countAllByWorkspaceId,
  create,
  deleteByWorkspaceIdAndUserId,
  findAllByWorkspaceId,
  findByWorkspaceIdAndUserId,
  updateByWorkspaceIdAndUserId,
};
