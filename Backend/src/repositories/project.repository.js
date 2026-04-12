const { getDb } = require("../config/database");

const create = async ({
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
    .select(
      "id",
      "project_name",
      "project_owner",
      "description",
      "status",
      "start_date",
      "end_date",
      "tags",
      "created_at",
      "created_by",
      "updated_at"
    )
    .where({ id })
    .first();
};

const findAllByUserId = async (userId, trx = getDb()) => {
  return trx("projects")
    .join("project_users", "project_users.project_id", "projects.id")
    .select(
      "projects.id",
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
      "project_users.role as membership_role",
      "project_users.status as membership_status"
    )
    .where("project_users.user_id", userId)
    .orderBy("projects.created_at", "desc");
};

const findByIdForUser = async (projectId, userId, trx = getDb()) => {
  return trx("projects")
    .join("project_users", "project_users.project_id", "projects.id")
    .select(
      "projects.id",
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
      "project_users.role as membership_role",
      "project_users.status as membership_status"
    )
    .where("projects.id", projectId)
    .andWhere("project_users.user_id", userId)
    .first();
};

const updateById = async (id, updates, trx = getDb()) => {
  const mappedUpdates = {};

  if (updates.projectName !== undefined) {
    mappedUpdates.project_name = updates.projectName;
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

  return trx("projects").where({ id }).update(mappedUpdates);
};

const deleteById = async (id, trx = getDb()) => {
  return trx("projects").where({ id }).del();
};

module.exports = {
  create,
  deleteById,
  findAllByUserId,
  findById,
  findByIdForUser,
  updateById,
};
