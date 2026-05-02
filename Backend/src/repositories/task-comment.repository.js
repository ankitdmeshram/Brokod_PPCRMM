const { getDb } = require("../config/database");

const create = async ({ taskId, comment, createdBy }, trx = getDb()) => {
  const result = await trx("task_comments").insert({
    task_id: taskId,
    comment,
    created_by: createdBy,
  });

  return result[0];
};

module.exports = {
  create,
};
