const hasIndex = async (knex, tableName, indexName) => {
  const [rows] = await knex.raw("SHOW INDEX FROM ?? WHERE Key_name = ?", [
    tableName,
    indexName,
  ]);

  return rows.length > 0;
};

const dropIndexIfExists = async (knex, tableName, indexName) => {
  if (!(await hasIndex(knex, tableName, indexName))) {
    return;
  }

  await knex.raw("ALTER TABLE ?? DROP INDEX ??", [tableName, indexName]);
};

const addUniqueIfMissing = async (knex, tableName, columns, indexName) => {
  if (await hasIndex(knex, tableName, indexName)) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.unique(columns, indexName);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (hasProjectsTable) {
    await dropIndexIfExists(knex, "projects", "projects_slug_unique");
    await addUniqueIfMissing(
      knex,
      "projects",
      ["workspace_id", "slug"],
      "projects_workspace_id_slug_unique"
    );
  }

  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (hasTasksTable) {
    await dropIndexIfExists(knex, "tasks", "tasks_slug_unique");
    await addUniqueIfMissing(
      knex,
      "tasks",
      ["project_id", "slug"],
      "tasks_project_id_slug_unique"
    );
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (hasProjectsTable) {
    await dropIndexIfExists(knex, "projects", "projects_workspace_id_slug_unique");
    await addUniqueIfMissing(knex, "projects", ["slug"], "projects_slug_unique");
  }

  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (hasTasksTable) {
    await dropIndexIfExists(knex, "tasks", "tasks_project_id_slug_unique");
    await addUniqueIfMissing(knex, "tasks", ["slug"], "tasks_slug_unique");
  }
};
