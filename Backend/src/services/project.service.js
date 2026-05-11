const { getDb } = require("../config/database");
const projectUserRepository = require("../repositories/project-user.repository");
const projectRepository = require("../repositories/project.repository");
const workspaceRepository = require("../repositories/workspace.repository");
const AppError = require("../utils/app-error");
const { buildTimestampedSlug, slugify } = require("../utils/slug");
const {
  validateCreateProjectPayload,
  validateUpdateProjectPayload,
} = require("../validators/project.validator");

const mapProject = (project) => ({
  id: project.id,
  workspaceId: project.workspace_id ?? project.workspaceId ?? null,
  workspaceName: project.workspace_name ?? project.workspaceName ?? null,
  workspaceSlug: project.workspace_slug ?? project.workspaceSlug ?? null,
  projectName: project.project_name ?? project.projectName,
  slug: project.slug ?? null,
  projectOwner: project.project_owner ?? project.projectOwner,
  description: project.description,
  status: project.status,
  startDate: project.start_date ?? project.startDate,
  endDate: project.end_date ?? project.endDate,
  tags:
    typeof project.tags === "string"
      ? JSON.parse(project.tags || "[]")
      : Array.isArray(project.tags)
        ? project.tags
        : [],
  createdAt: project.created_at ?? project.createdAt ?? null,
  createdBy: project.created_by ?? project.createdBy,
  updatedAt: project.updated_at ?? project.updatedAt ?? null,
  deletedAt: project.deleted_at ?? project.deletedAt ?? null,
  deletedBy: project.deleted_by ?? project.deletedBy ?? null,
  membershipRole: project.membership_role ?? project.membershipRole ?? null,
  membershipStatus: project.membership_status ?? project.membershipStatus ?? null,
});

const isSuperAdmin = (role = "") =>
  String(role).trim().toLowerCase() === "super-admin";

const buildUniqueProjectSlug = async (
  projectName,
  workspaceId,
  excludeProjectId = null,
  trx = getDb()
) => {
  const baseSlug = slugify(projectName, "project");
  let candidateSlug = baseSlug;
  let timestampSeed = Date.now();

  while (true) {
    const existingProject = await projectRepository.findBySlug(
      candidateSlug,
      workspaceId,
      trx
    );

    if (!existingProject || Number(existingProject.id) === Number(excludeProjectId)) {
      return candidateSlug;
    }

    timestampSeed += 1;
    candidateSlug = buildTimestampedSlug(baseSlug, timestampSeed);
  }
};

const mapProjectUser = (projectUser) => ({
  id: projectUser.id,
  projectId: projectUser.project_id ?? projectUser.projectId,
  userId: projectUser.user_id ?? projectUser.userId,
  role: projectUser.role,
  status: projectUser.status,
  createdAt: projectUser.created_at ?? projectUser.createdAt ?? null,
  createdBy: projectUser.created_by ?? projectUser.createdBy,
  updatedAt: projectUser.updated_at ?? projectUser.updatedAt ?? null,
  user: {
    id: projectUser.user_id ?? projectUser.userId,
    firstName: projectUser.first_name ?? projectUser.firstName,
    lastName: projectUser.last_name ?? projectUser.lastName,
    email: projectUser.email,
    phone: projectUser.phone,
    isActive: Boolean(projectUser.is_active ?? projectUser.isActive),
  },
});

const createProject = async (payload, userId) => {
  const { workspaceId, projectName, description, status, startDate, endDate, tags } =
    validateCreateProjectPayload(payload);

  const workspace = await workspaceRepository.findByIdForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError("Workspace not found.", 404);
  }

  const project = await getDb().transaction(async (trx) => {
    const slug = await buildUniqueProjectSlug(projectName, workspaceId, null, trx);
    const projectId = await projectRepository.create(
      {
        workspaceId,
        projectName,
        slug,
        projectOwner: userId,
        description,
        status,
        startDate,
        endDate,
        tags,
        createdBy: userId,
      },
      trx
    );

    await projectUserRepository.create(
      {
        projectId,
        userId,
        role: "owner",
        status: "active",
        createdBy: userId,
      },
      trx
    );

    return projectRepository.findById(projectId, trx);
  });

  return mapProject(project);
};

const getProjects = async (userId, filters = {}, userRole = "") => {
  const normalizedFilters = {};
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 10);

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError("Please provide a valid page number.", 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError("Please provide a valid limit between 1 and 100.", 400);
  }

  if (filters.workspaceId !== undefined) {
    const workspaceId = Number(filters.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      throw new AppError("Please provide a valid workspace id.", 400);
    }

    normalizedFilters.workspaceId = workspaceId;
  }

  if (filters.search) {
    normalizedFilters.search = String(filters.search).trim();
  }

  normalizedFilters.limit = limit;
  normalizedFilters.offset = (page - 1) * limit;

  const [projects, total] = await (isSuperAdmin(userRole)
    ? Promise.all([
        projectRepository.findAll(normalizedFilters),
        projectRepository.countAll(normalizedFilters),
      ])
    : Promise.all([
        projectRepository.findAllByUserId(userId, normalizedFilters),
        projectRepository.countAllByUserId(userId, normalizedFilters),
      ]));

  return {
    projects: projects.map(mapProject),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getProjectById = async (projectId, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const project = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  return mapProject(project);
};

const getProjectBySlug = async (
  projectSlug,
  userId,
  userRole = "",
  workspaceId = null
) => {
  const normalizedProjectSlug = String(projectSlug || "").trim();
  const normalizedWorkspaceId =
    workspaceId === null || workspaceId === undefined || workspaceId === ""
      ? null
      : Number(workspaceId);

  if (!normalizedProjectSlug) {
    throw new AppError("Please provide a valid project slug.", 400);
  }

  if (
    normalizedWorkspaceId !== null &&
    (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0)
  ) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const project = isSuperAdmin(userRole)
    ? await projectRepository.findBySlug(normalizedProjectSlug, normalizedWorkspaceId)
    : await projectRepository.findBySlugForUser(
        normalizedProjectSlug,
        userId,
        normalizedWorkspaceId
      );

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  return mapProject(project);
};

const getProjectUsers = async (projectId, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  const projectUsers = await projectUserRepository.findAllByProjectId(normalizedProjectId);

  return {
    project: mapProject(existingProject),
    users: projectUsers.map(mapProjectUser),
  };
};

const updateProject = async (projectId, payload, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (!isSuperAdmin(userRole) && existingProject.membership_role !== "owner") {
    throw new AppError("Only the project owner can update this project.", 403);
  }

  const updates = validateUpdateProjectPayload(payload, existingProject);
  const currentProjectName =
    existingProject.project_name ?? existingProject.projectName;
  const currentWorkspaceId = Number(
    existingProject.workspace_id ?? existingProject.workspaceId
  );
  const nextWorkspaceId = updates.workspaceId ?? currentWorkspaceId;
  const nextSlug =
    updates.projectName === undefined &&
    nextWorkspaceId === currentWorkspaceId
      ? existingProject.slug
      : await buildUniqueProjectSlug(
          updates.projectName ?? currentProjectName,
          nextWorkspaceId,
          normalizedProjectId
        );

  if (updates.workspaceId !== undefined) {
    const workspace = isSuperAdmin(userRole)
      ? await workspaceRepository.findById(updates.workspaceId)
      : await workspaceRepository.findByIdForUser(updates.workspaceId, userId);

    if (!workspace) {
      throw new AppError("Workspace not found.", 404);
    }
  }

  await projectRepository.updateById(normalizedProjectId, {
    ...updates,
    slug: nextSlug,
  });

  const updatedProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  return mapProject(updatedProject);
};

const deleteProject = async (projectId, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (!isSuperAdmin(userRole) && existingProject.membership_role !== "owner") {
    throw new AppError("Only the project owner can delete this project.", 403);
  }

  await projectRepository.softDeleteById(normalizedProjectId, userId);
};

module.exports = {
  createProject,
  deleteProject,
  getProjectById,
  getProjectBySlug,
  getProjects,
  getProjectUsers,
  updateProject,
};
