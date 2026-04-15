/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasWorkspaceUsersTable = await knex.schema.hasTable("workspace_users");

  if (!hasWorkspaceUsersTable) {
    await knex.schema.createTable("workspace_users", (table) => {
      table.increments("id").primary();
      table.integer("workspace_id").unsigned().notNullable();
      table.integer("user_id").unsigned().notNullable();
      table.string("role", 50).notNullable();
      table.string("status", 50).notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.integer("created_by").unsigned().notNullable();
      table
        .timestamp("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

      table
        .foreign("workspace_id", "workspace_users_workspace_id_foreign")
        .references("id")
        .inTable("workspaces")
        .onDelete("CASCADE");
      table
        .foreign("user_id", "workspace_users_user_id_foreign")
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table
        .foreign("created_by", "workspace_users_created_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.unique(["workspace_id", "user_id"], "workspace_users_workspace_id_user_id_unique");
    });
  }

  const hasWorkspacesTable = await knex.schema.hasTable("workspaces");

  if (!hasWorkspacesTable) {
    return;
  }

  await knex.raw(`
    INSERT INTO workspace_users (workspace_id, user_id, role, status, created_at, created_by, updated_at)
    SELECT
      w.id,
      w.created_by,
      'owner',
      'active',
      w.created_at,
      w.created_by,
      w.updated_at
    FROM workspaces w
    LEFT JOIN workspace_users wu
      ON wu.workspace_id = w.id
      AND wu.user_id = w.created_by
    WHERE wu.id IS NULL
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("workspace_users");
};
