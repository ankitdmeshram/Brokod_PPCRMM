const { getDb } = require("../config/database");
const customFieldRepository = require("../repositories/custom-field.repository");
const projectUserRepository = require("../repositories/project-user.repository");
const projectRepository = require("../repositories/project.repository");
const workspaceUserRepository = require("../repositories/workspace-user.repository");
const userRepository = require("../repositories/user.repository");
const workspaceRepository = require("../repositories/workspace.repository");
const AppError = require("../utils/app-error");
const { hashPassword } = require("../utils/password");
const { buildTimestampedSlug, slugify } = require("../utils/slug");
const {
  staticTaskListColumnKeys,
  validateAddProjectUserPayload,
  validateCreateProjectPayload,
  validateUpdateProjectUserPayload,
  validateUpdateProjectPayload,
  validateUpdateTaskColumnsPayload,
} = require("../validators/project.validator");
const {
  validateCreateCustomFieldPayload,
  validateUpdateCustomFieldPayload,
} = require("../validators/custom-field.validator");

const buildCustomFieldColumnKey = (fieldId) => `customField:${fieldId}`;

const mapCustomField = (field) => ({
  id: field.id,
  projectId: field.project_id ?? field.projectId,
  label: field.label,
  fieldType: field.field_type ?? field.fieldType,
  options:
    typeof field.options === "string"
      ? JSON.parse(field.options || "null")
      : Array.isArray(field.options)
        ? field.options
        : field.options ?? null,
  sortPosition: field.sort_position ?? field.sortPosition ?? 0,
  createdBy: field.created_by ?? field.createdBy,
  createdAt: field.created_at ?? field.createdAt ?? null,
  updatedAt: field.updated_at ?? field.updatedAt ?? null,
});

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
  access: project.access ?? "private",
  startDate: project.start_date ?? project.startDate,
  endDate: project.end_date ?? project.endDate,
  tags:
    typeof project.tags === "string"
      ? JSON.parse(project.tags || "[]")
      : Array.isArray(project.tags)
        ? project.tags
        : [],
  taskListColumns:
    typeof project.task_list_columns === "string"
      ? JSON.parse(project.task_list_columns || "null")
      : Array.isArray(project.task_list_columns)
        ? project.task_list_columns
        : project.task_list_columns ?? project.taskListColumns ?? null,
  createdAt: project.created_at ?? project.createdAt ?? null,
  createdBy: project.created_by ?? project.createdBy,
  updatedAt: project.updated_at ?? project.updatedAt ?? null,
  deletedAt: project.deleted_at ?? project.deletedAt ?? null,
  deletedBy: project.deleted_by ?? project.deletedBy ?? null,
  membershipRole: project.membership_role ?? project.membershipRole ?? null,
  membershipStatus: project.membership_status ?? project.membershipStatus ?? null,
  workspaceMembershipRole:
    project.workspace_membership_role ?? project.workspaceMembershipRole ?? null,
  workspaceMembershipStatus:
    project.workspace_membership_status ?? project.workspaceMembershipStatus ?? null,
});

const isSuperAdmin = (role = "") =>
  String(role).trim().toLowerCase() === "super-admin";

const canCreateWorkspaceProject = async (workspaceId, userId, userRole = "") => {
  if (isSuperAdmin(userRole)) {
    return true;
  }

  const workspaceMembership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    workspaceId,
    userId
  );

  if (!workspaceMembership) {
    return false;
  }

  if (String(workspaceMembership.status || "").trim().toLowerCase() !== "active") {
    return false;
  }

  const workspaceRole = String(workspaceMembership.role || "")
    .trim()
    .toLowerCase();

  if (workspaceRole === "owner" || workspaceRole === "admin" || workspaceRole === "member") {
    return true;
  }

  return false;
};

const hasWorkspaceProjectAccess = (project = {}) => {
  const workspaceRole = String(
    project.workspace_membership_role ?? project.workspaceMembershipRole ?? ""
  )
    .trim()
    .toLowerCase();

  return workspaceRole === "owner" || workspaceRole === "admin";
};

const hasWorkspaceProjectEditAccess = (project = {}) => {
  const workspaceRole = String(
    project.workspace_membership_role ?? project.workspaceMembershipRole ?? ""
  )
    .trim()
    .toLowerCase();

  return workspaceRole === "owner" || workspaceRole === "admin" || workspaceRole === "member";
};

const canManageProject = (project = {}, userRole = "") =>
  isSuperAdmin(userRole) ||
  String(project.membership_role ?? project.membershipRole ?? "")
    .trim()
    .toLowerCase() === "owner" ||
  hasWorkspaceProjectAccess(project);

const canUpdateOrDeleteProject = (project = {}, userRole = "") =>
  isSuperAdmin(userRole) ||
  hasWorkspaceProjectAccess(project) ||
  (String(project.membership_role ?? project.membershipRole ?? "")
    .trim()
    .toLowerCase() === "owner" &&
    hasWorkspaceProjectEditAccess(project));

const splitInviteeName = (name = "") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "User",
  };
};

const generateTemporaryPassword = () =>
  `Brokod@${Math.random().toString(36).slice(-8)}${Date.now().toString().slice(-4)}`;

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
    const existingProject = await projectRepository.findBySlugIncludingDeleted(
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

const createProject = async (payload, userId, userRole = "") => {
  const { workspaceId, projectName, description, status, access, startDate, endDate, tags } =
    validateCreateProjectPayload(payload);

  const workspace = await workspaceRepository.findByIdForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError("Workspace not found.", 404);
  }

  const hasCreateAccess = await canCreateWorkspaceProject(workspaceId, userId, userRole);

  if (!hasCreateAccess) {
    throw new AppError(
      "Only workspace owners, admins, or members can create a project in this workspace.",
      403
    );
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
        access,
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

const addProjectUser = async (projectId, payload, userId, userRole = "") => {
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

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage project users.",
      403
    );
  }

  const validatedPayload = validateAddProjectUserPayload(payload);
  const workspaceId = Number(existingProject.workspace_id ?? existingProject.workspaceId);

  return getDb().transaction(async (trx) => {
    let targetUser = null;
    let temporaryPassword = null;

    if (validatedPayload.mode === "existing_workspace_user") {
      const workspaceMembership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
        workspaceId,
        validatedPayload.userId,
        trx
      );

      if (!workspaceMembership) {
        throw new AppError("Selected user is not part of the workspace.", 404);
      }

      if (String(workspaceMembership.status || "").toLowerCase() !== "active") {
        throw new AppError("Selected workspace user is inactive.", 400);
      }

      targetUser = await userRepository.findById(validatedPayload.userId);

      if (!targetUser) {
        throw new AppError("Selected workspace user was not found.", 404);
      }
    } else {
      const { firstName, lastName } = splitInviteeName(validatedPayload.name);
      targetUser = await userRepository.findByEmail(validatedPayload.email);

      if (!targetUser) {
        temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await hashPassword(temporaryPassword);
        const targetUserId = await userRepository.create(
          {
            firstName,
            lastName,
            email: validatedPayload.email,
            phone: validatedPayload.phone,
            password: hashedPassword,
          },
          trx
        );

        targetUser = await userRepository.findById(targetUserId);
      }

      const existingWorkspaceMembership =
        await workspaceUserRepository.findByWorkspaceIdAndUserId(
          workspaceId,
          targetUser.id,
          trx
        );

      if (existingWorkspaceMembership) {
        if (String(existingWorkspaceMembership.status || "").toLowerCase() !== "active") {
          throw new AppError("This workspace user is inactive and cannot be added.", 400);
        }
      } else {
        await workspaceUserRepository.create(
          {
            workspaceId,
            userId: targetUser.id,
            role: "member",
            status: "active",
            createdBy: userId,
          },
          trx
        );
      }
    }

    const existingProjectMembership = await projectUserRepository.findByProjectIdAndUserId(
      normalizedProjectId,
      targetUser.id,
      trx
    );

    if (existingProjectMembership) {
      throw new AppError("This user is already part of the project.", 409);
    }

    await projectUserRepository.create(
      {
        projectId: normalizedProjectId,
        userId: targetUser.id,
        role: validatedPayload.role,
        status: "active",
        createdBy: userId,
      },
      trx
    );

    const refreshedUsers = await projectUserRepository.findAllByProjectId(normalizedProjectId, trx);
    const createdProjectUser = refreshedUsers.find(
      (projectUser) => Number(projectUser.user_id) === Number(targetUser.id)
    );

    if (!createdProjectUser) {
      throw new AppError("Project user could not be created.", 500);
    }

    return {
      project: mapProject(existingProject),
      user: mapProjectUser(createdProjectUser),
      temporaryPassword,
      createdNewUser: Boolean(temporaryPassword),
    };
  });
};

const updateProjectUser = async (projectId, projectUserId, payload, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);
  const normalizedProjectUserId = Number(projectUserId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  if (!Number.isInteger(normalizedProjectUserId) || normalizedProjectUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage project users.",
      403
    );
  }

  const existingProjectUser = await projectUserRepository.findByProjectIdAndUserId(
    normalizedProjectId,
    normalizedProjectUserId
  );

  if (!existingProjectUser) {
    throw new AppError("Project user not found.", 404);
  }

  const updates = validateUpdateProjectUserPayload(payload);

  if (
    normalizedProjectUserId === Number(userId) &&
    updates.role !== undefined &&
    updates.role !== "owner"
  ) {
    throw new AppError("You cannot change your own project owner role.", 400);
  }

  if (
    String(existingProjectUser.role || "").toLowerCase() === "owner" &&
    updates.role !== undefined &&
    updates.role !== "owner"
  ) {
    throw new AppError("Project owner role cannot be changed from this screen.", 400);
  }

  await projectUserRepository.updateByProjectIdAndUserId(normalizedProjectId, normalizedProjectUserId, {
    role: updates.role ?? existingProjectUser.role,
    status: updates.status ?? existingProjectUser.status,
  });

  const refreshedUsers = await projectUserRepository.findAllByProjectId(normalizedProjectId);
  const refreshedProjectUser = refreshedUsers.find(
    (projectUser) => Number(projectUser.user_id) === normalizedProjectUserId
  );

  if (!refreshedProjectUser) {
    throw new AppError("Project user not found.", 404);
  }

  return mapProjectUser(refreshedProjectUser);
};

const deleteProjectUser = async (projectId, projectUserId, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);
  const normalizedProjectUserId = Number(projectUserId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  if (!Number.isInteger(normalizedProjectUserId) || normalizedProjectUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage project users.",
      403
    );
  }

  const existingProjectUser = await projectUserRepository.findByProjectIdAndUserId(
    normalizedProjectId,
    normalizedProjectUserId
  );

  if (!existingProjectUser) {
    throw new AppError("Project user not found.", 404);
  }

  if (normalizedProjectUserId === Number(userId)) {
    throw new AppError("You cannot remove yourself from the project.", 400);
  }

  if (String(existingProjectUser.role || "").toLowerCase() === "owner") {
    throw new AppError("Project owner cannot be removed.", 400);
  }

  await projectUserRepository.deleteByProjectIdAndUserId(
    normalizedProjectId,
    normalizedProjectUserId
  );
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

  if (!canUpdateOrDeleteProject(existingProject, userRole)) {
    throw new AppError(
      "Only workspace owners/admins or project owners with non-viewer workspace access can update this project.",
      403
    );
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

const updateProjectTaskColumns = async (projectId, payload, userId, userRole = "") => {
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

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage task list columns.",
      403
    );
  }

  const customFields = await customFieldRepository.findAllByProjectId(normalizedProjectId);
  const allowedKeys = [
    ...staticTaskListColumnKeys,
    ...customFields.map((field) => buildCustomFieldColumnKey(field.id)),
  ];

  const columns = validateUpdateTaskColumnsPayload(payload, allowedKeys);

  await projectRepository.updateById(normalizedProjectId, { taskListColumns: columns });

  const updatedProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  return mapProject(updatedProject);
};

const getProjectCustomFields = async (projectId, userId, userRole = "") => {
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

  const customFields = await customFieldRepository.findAllByProjectId(normalizedProjectId);

  return customFields.map(mapCustomField);
};

const createProjectCustomField = async (projectId, payload, userId, userRole = "") => {
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

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage custom fields.",
      403
    );
  }

  const { label, fieldType, options } = validateCreateCustomFieldPayload(payload);
  const sortPosition = await customFieldRepository.getNextSortPosition(normalizedProjectId);

  const fieldId = await customFieldRepository.create({
    projectId: normalizedProjectId,
    label,
    fieldType,
    options,
    sortPosition,
    createdBy: userId,
  });

  const createdField = await customFieldRepository.findById(fieldId);

  return mapCustomField(createdField);
};

const updateProjectCustomField = async (projectId, fieldId, payload, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);
  const normalizedFieldId = Number(fieldId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  if (!Number.isInteger(normalizedFieldId) || normalizedFieldId <= 0) {
    throw new AppError("Please provide a valid custom field id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage custom fields.",
      403
    );
  }

  const existingField = await customFieldRepository.findById(normalizedFieldId);

  if (!existingField || Number(existingField.project_id) !== normalizedProjectId) {
    throw new AppError("Custom field not found.", 404);
  }

  const updates = validateUpdateCustomFieldPayload(payload, existingField);

  await customFieldRepository.updateById(normalizedFieldId, updates);

  const updatedField = await customFieldRepository.findById(normalizedFieldId);

  return mapCustomField(updatedField);
};

const deleteProjectCustomField = async (projectId, fieldId, userId, userRole = "") => {
  const normalizedProjectId = Number(projectId);
  const normalizedFieldId = Number(fieldId);

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  if (!Number.isInteger(normalizedFieldId) || normalizedFieldId <= 0) {
    throw new AppError("Please provide a valid custom field id.", 400);
  }

  const existingProject = isSuperAdmin(userRole)
    ? await projectRepository.findById(normalizedProjectId)
    : await projectRepository.findByIdForUser(normalizedProjectId, userId);

  if (!existingProject) {
    throw new AppError("Project not found.", 404);
  }

  if (!canManageProject(existingProject, userRole)) {
    throw new AppError(
      "Only the project owner or a workspace owner/admin can manage custom fields.",
      403
    );
  }

  const existingField = await customFieldRepository.findById(normalizedFieldId);

  if (!existingField || Number(existingField.project_id) !== normalizedProjectId) {
    throw new AppError("Custom field not found.", 404);
  }

  await customFieldRepository.deleteById(normalizedFieldId);
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

  if (!canUpdateOrDeleteProject(existingProject, userRole)) {
    throw new AppError(
      "Only workspace owners/admins or project owners with non-viewer workspace access can delete this project.",
      403
    );
  }

  await projectRepository.softDeleteById(normalizedProjectId, userId);
};

module.exports = {
  addProjectUser,
  createProject,
  createProjectCustomField,
  deleteProjectUser,
  deleteProject,
  deleteProjectCustomField,
  getProjectById,
  getProjectBySlug,
  getProjectCustomFields,
  getProjects,
  getProjectUsers,
  updateProjectUser,
  updateProject,
  updateProjectCustomField,
  updateProjectTaskColumns,
};
