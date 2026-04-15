const { getDb } = require("../config/database");
const projectUserRepository = require("../repositories/project-user.repository");
const projectRepository = require("../repositories/project.repository");
const workspaceRepository = require("../repositories/workspace.repository");
const AppError = require("../utils/app-error");
const {
  validateCreateProjectPayload,
  validateUpdateProjectPayload,
} = require("../validators/project.validator");

const mapProject = (project) => ({
  id: project.id,
  workspaceId: project.workspace_id ?? project.workspaceId ?? null,
  projectName: project.project_name ?? project.projectName,
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
    const projectId = await projectRepository.create(
      {
        workspaceId,
        projectName,
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

const getProjects = async (userId, filters = {}) => {
  const normalizedFilters = {};

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

  const projects = await projectRepository.findAllByUserId(userId, normalizedFilters);
  return projects.map(mapProject);
};

const getProjectById = async (projectId, userId) => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const project = await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  return mapProject(project);
};

const getProjectUsers = async (projectId, userId) => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const existingProject = await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  const projectUsers = await projectUserRepository.findAllByProjectId(normalizedProjectId);

  return {
    project: mapProject(existingProject),
    users: projectUsers.map(mapProjectUser),
  };
};

const updateProject = async (projectId, payload, userId) => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const existingProject = await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (existingProject.membership_role !== "owner") {
    throw new AppError("Only the project owner can update this project.", 403);
  }

  const updates = validateUpdateProjectPayload(payload, existingProject);

  if (updates.workspaceId !== undefined) {
    const workspace = await workspaceRepository.findByIdForUser(
      updates.workspaceId,
      userId
    );

    if (!workspace) {
      throw new AppError("Workspace not found.", 404);
    }
  }

  await projectRepository.updateById(normalizedProjectId, updates);

  const updatedProject = await projectRepository.findByIdForUser(normalizedProjectId, userId);

  return mapProject(updatedProject);
};

const deleteProject = async (projectId, userId) => {
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const existingProject = await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (existingProject.membership_role !== "owner") {
    throw new AppError("Only the project owner can delete this project.", 403);
  }

  await projectRepository.softDeleteById(normalizedProjectId, userId);
};

module.exports = {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  getProjectUsers,
  updateProject,
};
