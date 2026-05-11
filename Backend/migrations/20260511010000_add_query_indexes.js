const hasIndex = async (knex, tableName, indexName) => {
  const [rows] = await knex.raw("SHOW INDEX FROM ?? WHERE Key_name = ?", [
    tableName,
    indexName,
  ]);

  return rows.length > 0;
};

const createIndexIfMissing = async (knex, tableName, columns, indexName) => {
  const indexExists = await hasIndex(knex, tableName, indexName);

  if (indexExists) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.index(columns, indexName);
  });
};

const dropIndexIfExists = async (knex, tableName, indexName) => {
  const indexExists = await hasIndex(knex, tableName, indexName);

  if (!indexExists) {
    return;
  }

  await knex.raw("ALTER TABLE ?? DROP INDEX ??", [tableName, indexName]);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (hasTasksTable) {
    await createIndexIfMissing(knex, "tasks", ["status"], "tasks_status_index");
    await createIndexIfMissing(knex, "tasks", ["priority"], "tasks_priority_index");
    await createIndexIfMissing(knex, "tasks", ["due_date"], "tasks_due_date_index");
    await createIndexIfMissing(knex, "tasks", ["deleted_at"], "tasks_deleted_at_index");
  }

  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (hasProjectsTable) {
    await createIndexIfMissing(knex, "projects", ["deleted_at"], "projects_deleted_at_index");
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (hasTasksTable) {
    await dropIndexIfExists(knex, "tasks", "tasks_status_index");
    await dropIndexIfExists(knex, "tasks", "tasks_priority_index");
    await dropIndexIfExists(knex, "tasks", "tasks_due_date_index");
    await dropIndexIfExists(knex, "tasks", "tasks_deleted_at_index");
  }

  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (hasProjectsTable) {
    await dropIndexIfExists(knex, "projects", "projects_deleted_at_index");
  }
};
