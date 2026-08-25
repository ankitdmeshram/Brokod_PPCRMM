/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("projects", "task_list_columns");

  if (!hasColumn) {
    await knex.schema.alterTable("projects", (table) => {
      table.json("task_list_columns").nullable();
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("projects", "task_list_columns");

  if (hasColumn) {
    await knex.schema.alterTable("projects", (table) => {
      table.dropColumn("task_list_columns");
    });
  }
};
