/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasUsersTable = await knex.schema.hasTable("users");

  if (!hasUsersTable) {
    return;
  }

  const hasTimezone = await knex.schema.hasColumn("users", "timezone");

  if (!hasTimezone) {
    await knex.schema.alterTable("users", (table) => {
      table.string("timezone", 100).nullable().defaultTo("UTC");
    });
  }

  await knex.raw("UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL OR timezone = ''");
  await knex.raw("ALTER TABLE users MODIFY timezone VARCHAR(100) NOT NULL DEFAULT 'UTC'");
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasUsersTable = await knex.schema.hasTable("users");

  if (!hasUsersTable) {
    return;
  }

  const hasTimezone = await knex.schema.hasColumn("users", "timezone");

  if (hasTimezone) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("timezone");
    });
  }
};
