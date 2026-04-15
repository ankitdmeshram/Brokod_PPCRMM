/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasWorkspacesTable = await knex.schema.hasTable("workspaces");

  if (hasWorkspacesTable) {
    return;
  }

  await knex.schema.createTable("workspaces", (table) => {
    table.increments("id").primary();
    table.string("workspace_name", 255).notNullable();
    table.text("workspace_description").notNullable().defaultTo("");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.integer("created_by").unsigned().notNullable();

    table
      .foreign("created_by", "workspaces_created_by_foreign")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("workspaces");
};
