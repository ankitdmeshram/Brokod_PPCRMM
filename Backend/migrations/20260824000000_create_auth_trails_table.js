/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasAuthTrailsTable = await knex.schema.hasTable("auth_trails");

  if (hasAuthTrailsTable) {
    return;
  }

  await knex.schema.createTable("auth_trails", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().nullable();
    table.string("attempted_email", 255).nullable();
    table.string("event_type", 50).notNullable();
    table.string("outcome", 20).notNullable();
    table.string("failure_reason", 100).nullable();
    table.string("ip_address", 45).nullable();
    table.text("user_agent").nullable();
    table.string("request_id", 100).nullable();
    table.string("session_id", 100).nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("user_id", "auth_trails_user_id_foreign")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.index(["user_id", "created_at"], "auth_trails_user_created_at_index");
    table.index(
      ["attempted_email", "created_at"],
      "auth_trails_email_created_at_index"
    );
    table.index(["ip_address", "created_at"], "auth_trails_ip_created_at_index");
    table.index(["outcome", "created_at"], "auth_trails_outcome_created_at_index");
    table.index(["session_id"], "auth_trails_session_id_index");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("auth_trails");
};
