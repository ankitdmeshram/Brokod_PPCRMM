const { getDb } = require("../config/database");

const create = async ({ workspaceName, workspaceDescription, createdBy }, trx = getDb()) => {
  const result = await trx("workspaces").insert({
    workspace_name: workspaceName,
    workspace_description: workspaceDescription,
    created_by: createdBy,
  });

  return result[0];
};

const findById = async (id, trx = getDb()) => {
  return trx("workspaces")
    .select(
      "id",
      "workspace_name",
      "workspace_description",
      "created_at",
      "updated_at",
      "created_by",
      "deleted_at",
      "deleted_by"
    )
    .where({ id })
    .whereNull("deleted_at")
    .first();
};

const findAllByUserId = async (userId, trx = getDb()) => {
  return trx("workspaces")
    .join("workspace_users", "workspace_users.workspace_id", "workspaces.id")
    .select(
      "workspaces.id",
      "workspaces.workspace_name",
      "workspaces.workspace_description",
      "workspaces.created_at",
      "workspaces.updated_at",
      "workspaces.created_by",
      "workspaces.deleted_at",
      "workspaces.deleted_by",
      "workspace_users.role as membership_role",
      "workspace_users.status as membership_status"
    )
    .where("workspace_users.user_id", userId)
    .whereNull("workspaces.deleted_at")
    .orderBy("workspaces.created_at", "desc");
};

const findByIdForUser = async (id, userId, trx = getDb()) => {
  return trx("workspaces")
    .join("workspace_users", "workspace_users.workspace_id", "workspaces.id")
    .select(
      "workspaces.id",
      "workspaces.workspace_name",
      "workspaces.workspace_description",
      "workspaces.created_at",
      "workspaces.updated_at",
      "workspaces.created_by",
      "workspaces.deleted_at",
      "workspaces.deleted_by",
      "workspace_users.role as membership_role",
      "workspace_users.status as membership_status"
    )
    .where("workspaces.id", id)
    .andWhere("workspace_users.user_id", userId)
    .whereNull("workspaces.deleted_at")
    .first();
};

const softDeleteById = async (id, deletedBy, trx = getDb()) => {
  return trx("workspaces").where({ id }).whereNull("deleted_at").update({
    deleted_at: trx.fn.now(),
    deleted_by: deletedBy,
  });
};

const updateById = async (id, { workspaceName, workspaceDescription }, trx = getDb()) => {
  return trx("workspaces").where({ id }).whereNull("deleted_at").update({
    workspace_name: workspaceName,
    workspace_description: workspaceDescription,
  });
};

module.exports = {
  create,
  findAllByUserId,
  findById,
  findByIdForUser,
  softDeleteById,
  updateById,
};
