/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (!hasProjectsTable) {
    return;
  }

  await knex.schema.alterTable("projects", (table) => {
    table.date("start_date").nullable().alter();
    table.date("end_date").nullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (!hasProjectsTable) {
    return;
  }

  await knex.raw("UPDATE projects SET start_date = CURRENT_DATE WHERE start_date IS NULL");
  await knex.raw(
    "UPDATE projects SET end_date = COALESCE(end_date, start_date, CURRENT_DATE) WHERE end_date IS NULL"
  );

  await knex.schema.alterTable("projects", (table) => {
    table.date("start_date").notNullable().alter();
    table.date("end_date").notNullable().alter();
  });
};
