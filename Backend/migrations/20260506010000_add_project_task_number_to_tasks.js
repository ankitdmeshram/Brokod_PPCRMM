/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasProjectTaskNumberColumn = await knex.schema.hasColumn("tasks", "project_task_number");

  if (!hasProjectTaskNumberColumn) {
    await knex.schema.alterTable("tasks", (table) => {
      table.integer("project_task_number").unsigned().nullable();
    });
  }

  const tasksByProject = await knex("tasks")
    .select("id", "project_id")
    .orderBy("project_id", "asc")
    .orderBy("created_at", "asc")
    .orderBy("id", "asc");

  let currentProjectId = null;
  let currentProjectTaskNumber = 0;

  for (const task of tasksByProject) {
    if (currentProjectId !== task.project_id) {
      currentProjectId = task.project_id;
      currentProjectTaskNumber = 1;
    } else {
      currentProjectTaskNumber += 1;
    }

    await knex("tasks").where({ id: task.id }).update({
      project_task_number: currentProjectTaskNumber,
    });
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.integer("project_task_number").unsigned().notNullable().alter();
    table.unique(["project_id", "project_task_number"], "tasks_project_id_project_task_number_unique");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasProjectTaskNumberColumn = await knex.schema.hasColumn("tasks", "project_task_number");

  if (!hasProjectTaskNumberColumn) {
    return;
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.dropUnique(["project_id", "project_task_number"], "tasks_project_id_project_task_number_unique");
    table.dropColumn("project_task_number");
  });
};
