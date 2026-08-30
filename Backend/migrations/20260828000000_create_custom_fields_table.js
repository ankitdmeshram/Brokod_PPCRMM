/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable("custom_fields");

  if (!hasTable) {
    await knex.schema.createTable("custom_fields", (table) => {
      table.increments("id").primary();
      table.integer("project_id").unsigned().notNullable();
      table.string("label", 100).notNullable();
      table.string("field_type", 30).notNullable();
      table.json("options").nullable();
      table.integer("sort_position").notNullable().defaultTo(0);
      table.integer("created_by").unsigned().notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table
        .timestamp("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

      table
        .foreign("project_id", "custom_fields_project_id_foreign")
        .references("id")
        .inTable("projects")
        .onDelete("CASCADE");
      table
        .foreign("created_by", "custom_fields_created_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("custom_fields");
};
