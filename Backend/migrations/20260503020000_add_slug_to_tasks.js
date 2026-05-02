const { buildTimestampedSlug, slugify } = require("../src/utils/slug");

const buildUniqueSlug = async (knex, taskTitle, taskId) => {
  const baseSlug = slugify(taskTitle, "task");
  let candidateSlug = baseSlug;
  let timestampSeed = Date.now();

  while (true) {
    const existingTask = await knex("tasks")
      .select("id")
      .where("slug", candidateSlug)
      .andWhereNot("id", taskId)
      .first();

    if (!existingTask) {
      return candidateSlug;
    }

    timestampSeed += 1;
    candidateSlug = buildTimestampedSlug(baseSlug, timestampSeed);
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasSlugColumn = await knex.schema.hasColumn("tasks", "slug");

  if (!hasSlugColumn) {
    await knex.schema.alterTable("tasks", (table) => {
      table.string("slug", 255).nullable().after("title");
    });
  }

  const tasks = await knex("tasks").select("id", "title").orderBy("id", "asc");

  for (const task of tasks) {
    const uniqueSlug = await buildUniqueSlug(knex, task.title, task.id);

    await knex("tasks").where({ id: task.id }).update({
      slug: uniqueSlug,
    });
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.string("slug", 255).notNullable().alter();
  });

  await knex.schema.alterTable("tasks", (table) => {
    table.unique(["slug"], "tasks_slug_unique");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasSlugColumn = await knex.schema.hasColumn("tasks", "slug");

  if (!hasSlugColumn) {
    return;
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.dropUnique(["slug"], "tasks_slug_unique");
  });

  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("slug");
  });
};
