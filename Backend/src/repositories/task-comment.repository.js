const { getDb } = require("../config/database");

const create = async ({ taskId, comment, createdBy }, trx = getDb()) => {
  const result = await trx("task_comments").insert({
    task_id: taskId,
    comment,
    created_by: createdBy,
  });

  return result[0];
};

const buildBaseQuery = (trx = getDb()) =>
  trx("task_comments")
    .leftJoin("users", "users.id", "task_comments.created_by")
    .select(
      "task_comments.id",
      "task_comments.task_id",
      "task_comments.comment",
      "task_comments.created_by",
      "task_comments.created_at",
      "task_comments.updated_at",
      "users.first_name as created_by_first_name",
      "users.last_name as created_by_last_name",
      "users.email as created_by_email"
    );

const findById = async (id, trx = getDb()) =>
  buildBaseQuery(trx).where("task_comments.id", id).first();

const findByTaskId = async (taskId, trx = getDb()) =>
  buildBaseQuery(trx)
    .where("task_comments.task_id", taskId)
    .orderBy("task_comments.created_at", "desc")
    .orderBy("task_comments.id", "desc");

const updateById = async ({ id, taskId, comment }, trx = getDb()) =>
  trx("task_comments")
    .where("id", id)
    .andWhere("task_id", taskId)
    .update({
      comment,
      updated_at: trx.fn.now(),
    });

module.exports = {
  create,
  findById,
  findByTaskId,
  updateById,
};
