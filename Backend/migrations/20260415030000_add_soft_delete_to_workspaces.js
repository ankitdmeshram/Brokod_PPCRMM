/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasWorkspacesTable = await knex.schema.hasTable("workspaces");

  if (!hasWorkspacesTable) {
    return;
  }

  const hasDeletedAt = await knex.schema.hasColumn("workspaces", "deleted_at");
  const hasDeletedBy = await knex.schema.hasColumn("workspaces", "deleted_by");

  if (!hasDeletedAt) {
    await knex.schema.alterTable("workspaces", (table) => {
      table.timestamp("deleted_at").nullable().defaultTo(null);
    });
  }

  if (!hasDeletedBy) {
    await knex.schema.alterTable("workspaces", (table) => {
      table.integer("deleted_by").unsigned().nullable();
    });

    await knex.schema.alterTable("workspaces", (table) => {
      table
        .foreign("deleted_by", "workspaces_deleted_by_foreign")
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
  const hasWorkspacesTable = await knex.schema.hasTable("workspaces");

  if (!hasWorkspacesTable) {
    return;
  }

  const hasDeletedBy = await knex.schema.hasColumn("workspaces", "deleted_by");
  const hasDeletedAt = await knex.schema.hasColumn("workspaces", "deleted_at");

  if (hasDeletedBy) {
    await knex.schema.alterTable("workspaces", (table) => {
      table.dropForeign(["deleted_by"], "workspaces_deleted_by_foreign");
    });

    await knex.schema.alterTable("workspaces", (table) => {
      table.dropColumn("deleted_by");
    });
  }

  if (hasDeletedAt) {
    await knex.schema.alterTable("workspaces", (table) => {
      table.dropColumn("deleted_at");
    });
  }
};
