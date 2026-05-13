/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasTasksTable = await knex.schema.hasTable("tasks");

  if (!hasTasksTable) {
    await knex.schema.createTable("tasks", (table) => {
      table.increments("id").primary();
      table.integer("project_id").unsigned().notNullable();
      table.integer("workspace_id").unsigned().notNullable();
      table.string("title", 500).notNullable();
      table.text("description").notNullable().defaultTo("");
      table.string("status", 50).notNullable().defaultTo("todo");
      table.string("priority", 50).notNullable().defaultTo("medium");
      table.integer("assigned_by").unsigned().nullable();
      table.integer("assigned_to").unsigned().nullable();
      table.integer("created_by").unsigned().notNullable();
      table.date("start_date").nullable();
      table.date("due_date").nullable();
      table.date("completed_at").nullable();
      table.string("task_type", 50).notNullable().defaultTo("feature");
      table.json("tags").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table
        .timestamp("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.timestamp("deleted_at").nullable();
      table.integer("deleted_by").unsigned().nullable();

      table
        .foreign("project_id", "tasks_project_id_foreign")
        .references("id")
        .inTable("projects")
        .onDelete("CASCADE");
      table
        .foreign("workspace_id", "tasks_workspace_id_foreign")
        .references("id")
        .inTable("workspaces")
        .onDelete("CASCADE");
      table
        .foreign("assigned_by", "tasks_assigned_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table
        .foreign("assigned_to", "tasks_assigned_to_foreign")
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table
        .foreign("created_by", "tasks_created_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table
        .foreign("deleted_by", "tasks_deleted_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
    });
  }

  const hasTaskCommentsTable = await knex.schema.hasTable("task_comments");

  if (!hasTaskCommentsTable) {
    await knex.schema.createTable("task_comments", (table) => {
      table.increments("id").primary();
      table.integer("task_id").unsigned().notNullable();
      table.text("comment").notNullable();
      table.integer("created_by").unsigned().notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table
        .timestamp("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

      table
        .foreign("task_id", "task_comments_task_id_foreign")
        .references("id")
        .inTable("tasks")
        .onDelete("CASCADE");
      table
        .foreign("created_by", "task_comments_created_by_foreign")
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
    });
  }

  const hasTaskActivityLogsTable = await knex.schema.hasTable("task_activity_logs");

  if (!hasTaskActivityLogsTable) {
    await knex.schema.createTable("task_activity_logs", (table) => {
      table.increments("id").primary();
      table.integer("task_id").unsigned().notNullable();
      table.text("activity").notNullable();
      table.integer("created_by").unsigned().notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      table
        .foreign("task_id", "task_activity_logs_task_id_foreign")
        .references("id")
        .inTable("tasks")
        .onDelete("CASCADE");
      table
        .foreign("created_by", "task_activity_logs_created_by_foreign")
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
  await knex.schema.dropTableIfExists("task_activity_logs");
  await knex.schema.dropTableIfExists("task_comments");
  await knex.schema.dropTableIfExists("tasks");
};
