const { buildTimestampedSlug, slugify } = require("../src/utils/slug");

const buildUniqueSlug = async (knex, projectName, projectId) => {
  const baseSlug = slugify(projectName, "project");
  let candidateSlug = baseSlug;
  let timestampSeed = Date.now();

  while (true) {
    const existingProject = await knex("projects")
      .select("id")
      .where("slug", candidateSlug)
      .andWhereNot("id", projectId)
      .first();

    if (!existingProject) {
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
  const hasSlugColumn = await knex.schema.hasColumn("projects", "slug");

  if (!hasSlugColumn) {
    await knex.schema.alterTable("projects", (table) => {
      table.string("slug", 255).nullable().after("project_name");
    });
  }

  const projects = await knex("projects")
    .select("id", "project_name")
    .orderBy("id", "asc");

  for (const project of projects) {
    const uniqueSlug = await buildUniqueSlug(
      knex,
      project.project_name,
      project.id
    );

    await knex("projects").where({ id: project.id }).update({
      slug: uniqueSlug,
    });
  }

  await knex.schema.alterTable("projects", (table) => {
    table.string("slug", 255).notNullable().alter();
  });

  await knex.schema.alterTable("projects", (table) => {
    table.unique(["slug"], "projects_slug_unique");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasSlugColumn = await knex.schema.hasColumn("projects", "slug");

  if (!hasSlugColumn) {
    return;
  }

  await knex.schema.alterTable("projects", (table) => {
    table.dropUnique(["slug"], "projects_slug_unique");
  });

  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("slug");
  });
};
