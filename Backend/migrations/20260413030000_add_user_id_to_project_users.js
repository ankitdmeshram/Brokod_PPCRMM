/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectUsersTable = await knex.schema.hasTable("project_users");

  if (!hasProjectUsersTable) {
    return;
  }

  const hasUserId = await knex.schema.hasColumn("project_users", "user_id");

  if (hasUserId) {
    return;
  }

  await knex.schema.alterTable("project_users", (table) => {
    table.integer("user_id").unsigned().nullable().after("project_id");
  });

  await knex.raw("UPDATE project_users SET user_id = created_by WHERE user_id IS NULL");
  await knex.raw("ALTER TABLE project_users MODIFY user_id INT UNSIGNED NOT NULL");

  await knex.schema.alterTable("project_users", (table) => {
    table
      .foreign("user_id", "project_users_user_id_foreign")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasProjectUsersTable = await knex.schema.hasTable("project_users");

  if (!hasProjectUsersTable) {
    return;
  }

  const hasUserId = await knex.schema.hasColumn("project_users", "user_id");

  if (!hasUserId) {
    return;
  }

  await knex.schema.alterTable("project_users", (table) => {
    table.dropForeign(["user_id"], "project_users_user_id_foreign");
  });

  await knex.schema.alterTable("project_users", (table) => {
    table.dropColumn("user_id");
  });
};
