const hasIndex = async (knex, tableName, indexName) => {
  const [rows] = await knex.raw("SHOW INDEX FROM ?? WHERE Key_name = ?", [
    tableName,
    indexName,
  ]);

  return rows.length > 0;
};

/**
 * Manual task ordering.
 *
 * `sort_position` holds a gap-based rank (multiples of 1000) that drives the
 * default task order. Dragging a task writes a single row whose rank is the
 * midpoint of its two drop neighbours, so a reorder never rewrites the rows
 * that follow it. Ranks are signed because inserting at the top of a project
 * repeatedly walks the minimum below zero.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (!hasTasksTable) {
    return;
  }

  const hasSortPosition = await knex.schema.hasColumn("tasks", "sort_position");

  if (!hasSortPosition) {
    await knex.schema.alterTable("tasks", (table) => {
      table.bigInteger("sort_position").nullable().after("task_type");
    });
  }

  // Seed ranks from the ordering the list already used (newest first) so the
  // first render after this migration looks identical to the last one before it.
  await knex.raw(`
    UPDATE tasks AS target
    JOIN (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id
          ORDER BY created_at DESC, id DESC
        ) AS row_position
      FROM tasks
    ) AS ranked ON ranked.id = target.id
    SET target.sort_position = ranked.row_position * 1000
    WHERE target.sort_position IS NULL
  `);

  const hasSortPositionIndex = await hasIndex(
    knex,
    "tasks",
    "tasks_project_sort_position_index"
  );

  if (!hasSortPositionIndex) {
    await knex.schema.alterTable("tasks", (table) => {
      table.index(
        ["project_id", "deleted_at", "sort_position"],
        "tasks_project_sort_position_index"
      );
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

  const hasSortPosition = await knex.schema.hasColumn("tasks", "sort_position");

  if (!hasSortPosition) {
    return;
  }

  const hasSortPositionIndex = await hasIndex(
    knex,
    "tasks",
    "tasks_project_sort_position_index"
  );

  if (hasSortPositionIndex) {
    await knex.raw("ALTER TABLE ?? DROP INDEX ??", [
      "tasks",
      "tasks_project_sort_position_index",
    ]);
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("sort_position");
  });
};
