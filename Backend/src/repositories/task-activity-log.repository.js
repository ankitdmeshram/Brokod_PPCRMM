const { getDb } = require("../config/database");

const create = async ({ taskId, activity, createdBy }, trx = getDb()) => {
  const result = await trx("task_activity_logs").insert({
    task_id: taskId,
    activity,
    created_by: createdBy,
  });

  return result[0];
};

module.exports = {
  create,
};
