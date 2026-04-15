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

module.exports = {
  create,
};
