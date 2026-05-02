const { getDb } = require("../config/database");
const workspaceRepository = require("../repositories/workspace.repository");
const workspaceUserRepository = require("../repositories/workspace-user.repository");
const AppError = require("../utils/app-error");
const { buildTimestampedSlug, slugify } = require("../utils/slug");
const {
  validateCreateWorkspacePayload,
  validateUpdateWorkspacePayload,
} = require("../validators/workspace.validator");

const mapWorkspace = (workspace) => ({
  id: workspace.id,
  workspaceName: workspace.workspace_name ?? workspace.workspaceName,
  slug: workspace.slug,
  workspaceDescription:
    workspace.workspace_description ?? workspace.workspaceDescription ?? "",
  createdAt: workspace.created_at ?? workspace.createdAt ?? null,
  updatedAt: workspace.updated_at ?? workspace.updatedAt ?? null,
  membershipRole: workspace.membership_role ?? workspace.membershipRole ?? null,
  membershipStatus: workspace.membership_status ?? workspace.membershipStatus ?? null,
});

const buildUniqueWorkspaceSlug = async (workspaceName, excludeWorkspaceId = null, trx = getDb()) => {
  const baseSlug = slugify(workspaceName);
  let candidateSlug = baseSlug;
  let timestampSeed = Date.now();

  while (true) {
    const existingWorkspace = await workspaceRepository.findBySlug(candidateSlug, trx);

    if (!existingWorkspace || Number(existingWorkspace.id) === Number(excludeWorkspaceId)) {
      return candidateSlug;
    }

    timestampSeed += 1;
    candidateSlug = buildTimestampedSlug(baseSlug, timestampSeed);
  }
};

const createWorkspace = async (payload, userId) => {
  const { workspaceName, workspaceDescription } =
    validateCreateWorkspacePayload(payload);

  const workspace = await getDb().transaction(async (trx) => {
    const slug = await buildUniqueWorkspaceSlug(workspaceName, null, trx);
    const workspaceId = await workspaceRepository.create(
      {
        workspaceName,
        slug,
        workspaceDescription,
        createdBy: userId,
      },
      trx
    );

    await workspaceUserRepository.create(
      {
        workspaceId,
        userId,
        role: "owner",
        status: "active",
        createdBy: userId,
      },
      trx
    );

    return workspaceRepository.findByIdForUser(workspaceId, userId, trx);
  });

  return mapWorkspace(workspace);
};

const getWorkspaces = async (userId) => {
  const workspaces = await workspaceRepository.findAllByUserId(userId);
  return workspaces.map(mapWorkspace);
};

const updateWorkspace = async (workspaceId, payload, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const existingWorkspace = await workspaceRepository.findByIdForUser(
    normalizedWorkspaceId,
    userId
  );

  if (!existingWorkspace) {
    throw new AppError("Workspace not found.", 404);
  }

  if (existingWorkspace.membership_role !== "owner") {
    throw new AppError("Only the workspace owner can update this workspace.", 403);
  }

  const updates = validateUpdateWorkspacePayload(payload);

  const nextSlug =
    updates.workspaceName ===
    (existingWorkspace.workspace_name ?? existingWorkspace.workspaceName)
      ? existingWorkspace.slug
      : await buildUniqueWorkspaceSlug(
          updates.workspaceName,
          normalizedWorkspaceId
        );

  await workspaceRepository.updateById(normalizedWorkspaceId, {
    ...updates,
    slug: nextSlug,
  });

  const updatedWorkspace = await workspaceRepository.findByIdForUser(
    normalizedWorkspaceId,
    userId
  );

  return mapWorkspace(updatedWorkspace);
};

const deleteWorkspace = async (workspaceId, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const existingWorkspace = await workspaceRepository.findByIdForUser(
    normalizedWorkspaceId,
    userId
  );

  if (!existingWorkspace) {
    throw new AppError("Workspace not found.", 404);
  }

  if (existingWorkspace.membership_role !== "owner") {
    throw new AppError("Only the workspace owner can delete this workspace.", 403);
  }

  await workspaceRepository.softDeleteById(normalizedWorkspaceId, userId);
};

module.exports = {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  updateWorkspace,
};
