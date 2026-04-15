/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (!hasProjectsTable) {
    return;
  }

  const hasDeletedAt = await knex.schema.hasColumn("projects", "deleted_at");
  const hasDeletedBy = await knex.schema.hasColumn("projects", "deleted_by");

  if (!hasDeletedAt) {
    await knex.schema.alterTable("projects", (table) => {
      table.timestamp("deleted_at").nullable().defaultTo(null);
    });
  }

  if (!hasDeletedBy) {
    await knex.schema.alterTable("projects", (table) => {
      table.integer("deleted_by").unsigned().nullable();
    });

    await knex.schema.alterTable("projects", (table) => {
      table
        .foreign("deleted_by", "projects_deleted_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (!hasProjectsTable) {
    return;
  }

  const hasDeletedBy = await knex.schema.hasColumn("projects", "deleted_by");
  const hasDeletedAt = await knex.schema.hasColumn("projects", "deleted_at");

  if (hasDeletedBy) {
    await knex.schema.alterTable("projects", (table) => {
      table.dropForeign(["deleted_by"], "projects_deleted_by_foreign");
    });

    await knex.schema.alterTable("projects", (table) => {
      table.dropColumn("deleted_by");
    });
  }

  if (hasDeletedAt) {
    await knex.schema.alterTable("projects", (table) => {
      table.dropColumn("deleted_at");
    });
  }
};
