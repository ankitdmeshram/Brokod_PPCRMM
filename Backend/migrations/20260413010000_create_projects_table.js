/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (hasProjectsTable) {
    return;
  }

  await knex.schema.createTable("projects", (table) => {
    table.increments("id").primary();
    table.string("project_name", 255).notNullable();
    table.integer("project_owner").unsigned().notNullable();
    table.text("description").notNullable();
    table.string("status", 50).notNullable();
    table.date("start_date").notNullable();
    table.date("end_date").notNullable();
    table.json("tags").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("created_by").unsigned().notNullable();
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table
      .foreign("project_owner", "projects_project_owner_foreign")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .foreign("created_by", "projects_created_by_foreign")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("projects");
};
