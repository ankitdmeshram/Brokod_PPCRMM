exports.up = async function up(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.string("access", 50).notNullable().defaultTo("private");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("access");
  });
};
