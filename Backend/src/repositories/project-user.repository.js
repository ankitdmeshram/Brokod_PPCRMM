const { getDb } = require("../config/database");

const create = async ({ projectId, userId, role, status, createdBy }, trx = getDb()) => {
  const result = await trx("project_users").insert({
    project_id: projectId,
    user_id: userId,
    role,
    status,
    created_by: createdBy,
  });

  return result[0];
};

const findAllByProjectId = async (projectId, trx = getDb()) => {
  return trx("project_users")
    .join("users", "users.id", "project_users.user_id")
    .select(
      "project_users.id",
      "project_users.project_id",
      "project_users.user_id",
      "project_users.role",
      "project_users.status",
      "project_users.created_at",
      "project_users.created_by",
      "project_users.updated_at",
      "users.first_name",
      "users.last_name",
      "users.email",
      "users.phone",
      "users.is_active"
    )
    .where("project_users.project_id", projectId)
    .orderBy("project_users.created_at", "asc");
};

module.exports = {
  create,
  findAllByProjectId,
};
