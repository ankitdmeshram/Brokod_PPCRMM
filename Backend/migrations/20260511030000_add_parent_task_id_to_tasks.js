const hasIndex = async (knex, tableName, indexName) => {
  const [rows] = await knex.raw("SHOW INDEX FROM ?? WHERE Key_name = ?", [
    tableName,
    indexName,
  ]);

  return rows.length > 0;
};

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (!hasTasksTable) {
    return;
  }

  const hasParentTaskId = await knex.schema.hasColumn("tasks", "parent_task_id");

  if (!hasParentTaskId) {
    await knex.schema.alterTable("tasks", (table) => {
      table.integer("parent_task_id").unsigned().nullable().after("project_task_number");
    });
  }

  const hasParentTaskForeignKey = await knex
    .raw(
      `
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'tasks'
          AND COLUMN_NAME = 'parent_task_id'
          AND REFERENCED_TABLE_NAME = 'tasks'
          AND CONSTRAINT_NAME = 'tasks_parent_task_id_foreign'
      `
    )
    .then(([rows]) => rows.length > 0);

  if (!hasParentTaskForeignKey) {
    await knex.schema.alterTable("tasks", (table) => {
      table
        .foreign("parent_task_id", "tasks_parent_task_id_foreign")
        .references("id")
        .inTable("tasks")
        .onDelete("SET NULL");
    });
  }

  const hasParentTaskIndex = await hasIndex(knex, "tasks", "tasks_parent_task_id_index");

  if (!hasParentTaskIndex) {
    await knex.schema.alterTable("tasks", (table) => {
      table.index(["parent_task_id"], "tasks_parent_task_id_index");
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (!hasTasksTable) {
    return;
  }

  const hasParentTaskId = await knex.schema.hasColumn("tasks", "parent_task_id");

  if (!hasParentTaskId) {
    return;
  }

  const hasParentTaskIndex = await hasIndex(knex, "tasks", "tasks_parent_task_id_index");

  if (hasParentTaskIndex) {
    await knex.raw("ALTER TABLE ?? DROP INDEX ??", ["tasks", "tasks_parent_task_id_index"]);
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.dropForeign(["parent_task_id"], "tasks_parent_task_id_foreign");
  });

  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("parent_task_id");
  });
};
