/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectUsersTable = await knex.schema.hasTable("project_users");

  if (hasProjectUsersTable) {
    return;
  }

  await knex.schema.createTable("project_users", (table) => {
    table.increments("id").primary();
    table.integer("project_id").unsigned().notNullable();
    table.string("role", 50).notNullable();
    table.string("status", 50).notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("created_by").unsigned().notNullable();
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table
      .foreign("project_id", "project_users_project_id_foreign")
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");
    table
      .foreign("created_by", "project_users_created_by_foreign")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("project_users");
};
