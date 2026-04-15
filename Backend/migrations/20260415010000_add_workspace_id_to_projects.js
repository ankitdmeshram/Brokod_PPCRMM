/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  // This stays separate because projects are created before workspaces
  // in the migration order, so the foreign key must be added later.
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (!hasProjectsTable) {
    return;
  }

  const hasWorkspaceId = await knex.schema.hasColumn("projects", "workspace_id");

  if (hasWorkspaceId) {
    return;
  }

  await knex.schema.alterTable("projects", (table) => {
    table.integer("workspace_id").unsigned().nullable().after("project_owner");
  });

  await knex.schema.alterTable("projects", (table) => {
    table
      .foreign("workspace_id", "projects_workspace_id_foreign")
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  // Preserve rollback behavior for legacy databases only.
  const hasProjectsTable = await knex.schema.hasTable("projects");

  if (!hasProjectsTable) {
    return;
  }

  const hasWorkspaceId = await knex.schema.hasColumn("projects", "workspace_id");

  if (!hasWorkspaceId) {
    return;
  }

  await knex.schema.alterTable("projects", (table) => {
    table.dropForeign(["workspace_id"], "projects_workspace_id_foreign");
  });

  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("workspace_id");
  });
};
