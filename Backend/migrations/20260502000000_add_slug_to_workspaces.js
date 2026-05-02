const { buildTimestampedSlug, slugify } = require("../src/utils/slug");

const buildUniqueSlug = async (knex, workspaceName, workspaceId) => {
  const baseSlug = slugify(workspaceName);
  let candidateSlug = baseSlug;
  let timestampSeed = Date.now();

  while (true) {
    const existingWorkspace = await knex("workspaces")
      .select("id")
      .where("slug", candidateSlug)
      .andWhereNot("id", workspaceId)
      .first();

    if (!existingWorkspace) {
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
  const hasSlugColumn = await knex.schema.hasColumn("workspaces", "slug");

  if (!hasSlugColumn) {
    await knex.schema.alterTable("workspaces", (table) => {
      table.string("slug", 255).nullable().after("workspace_name");
    });
  }

  const workspaces = await knex("workspaces")
    .select("id", "workspace_name")
    .orderBy("id", "asc");

  for (const workspace of workspaces) {
    const uniqueSlug = await buildUniqueSlug(
      knex,
      workspace.workspace_name,
      workspace.id
    );

    await knex("workspaces").where({ id: workspace.id }).update({
      slug: uniqueSlug,
    });
  }

  await knex.schema.alterTable("workspaces", (table) => {
    table.string("slug", 255).notNullable().alter();
  });

  const hasSlugIndex = await knex.schema.hasColumn("workspaces", "slug");

  if (hasSlugIndex) {
    await knex.schema.alterTable("workspaces", (table) => {
      table.unique(["slug"], "workspaces_slug_unique");
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const hasSlugColumn = await knex.schema.hasColumn("workspaces", "slug");

  if (!hasSlugColumn) {
    return;
  }

  await knex.schema.alterTable("workspaces", (table) => {
    table.dropUnique(["slug"], "workspaces_slug_unique");
  });

  await knex.schema.alterTable("workspaces", (table) => {
    table.dropColumn("slug");
  });
};
