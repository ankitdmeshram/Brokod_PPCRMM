/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("tasks", "custom_field_values");

  if (!hasColumn) {
    await knex.schema.alterTable("tasks", (table) => {
      table.json("custom_field_values").nullable();
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("tasks", "custom_field_values");

  if (hasColumn) {
    await knex.schema.alterTable("tasks", (table) => {
      table.dropColumn("custom_field_values");
    });
  }
};
