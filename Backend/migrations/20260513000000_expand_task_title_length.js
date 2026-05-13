/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("tasks", (table) => {
    table.string("title", 500).notNullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable("tasks", (table) => {
    table.string("title", 255).notNullable().alter();
  });
};
