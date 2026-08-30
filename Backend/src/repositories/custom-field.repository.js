const { getDb } = require("../config/database");

const customFieldSelectColumns = [
  "custom_fields.id",
  "custom_fields.project_id",
  "custom_fields.label",
  "custom_fields.field_type",
  "custom_fields.options",
  "custom_fields.sort_position",
  "custom_fields.created_by",
  "custom_fields.created_at",
  "custom_fields.updated_at",
];

const findAllByProjectId = async (projectId, trx = getDb()) =>
  trx("custom_fields")
    .select(customFieldSelectColumns)
    .where("project_id", projectId)
    .orderBy("sort_position", "asc")
    .orderBy("id", "asc");

const findById = async (id, trx = getDb()) =>
  trx("custom_fields").select(customFieldSelectColumns).where("id", id).first();

const getNextSortPosition = async (projectId, trx = getDb()) => {
  const result = await trx("custom_fields")
    .max({ maxPosition: "sort_position" })
    .where("project_id", projectId)
    .first();

  return Number(result?.maxPosition || 0) + 1;
};

const create = async (
  { projectId, label, fieldType, options, sortPosition, createdBy },
  trx = getDb()
) => {
  const result = await trx("custom_fields").insert({
    project_id: projectId,
    label,
    field_type: fieldType,
    options: options === null || options === undefined ? null : JSON.stringify(options),
    sort_position: sortPosition,
    created_by: createdBy,
  });

  return result[0];
};

const updateById = async (id, updates, trx = getDb()) => {
  const mappedUpdates = {};

  if (updates.label !== undefined) {
    mappedUpdates.label = updates.label;
  }

  if (updates.fieldType !== undefined) {
    mappedUpdates.field_type = updates.fieldType;
  }

  if (updates.options !== undefined) {
    mappedUpdates.options = updates.options === null ? null : JSON.stringify(updates.options);
  }

  if (updates.sortPosition !== undefined) {
    mappedUpdates.sort_position = updates.sortPosition;
  }

  return trx("custom_fields").where({ id }).update(mappedUpdates);
};

const deleteById = async (id, trx = getDb()) => trx("custom_fields").where({ id }).delete();

module.exports = {
  create,
  deleteById,
  findAllByProjectId,
  findById,
  getNextSortPosition,
  updateById,
};
