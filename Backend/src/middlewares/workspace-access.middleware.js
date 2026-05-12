const workspaceRepository = require("../repositories/workspace.repository");
const workspaceUserRepository = require("../repositories/workspace-user.repository");
const projectRepository = require("../repositories/project.repository");
const taskRepository = require("../repositories/task.repository");
const AppError = require("../utils/app-error");

const assertActiveWorkspaceAccess = async (workspaceId, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const workspace = await workspaceRepository.findById(normalizedWorkspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found.", 404);
  }

  const membership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    userId
  );

  if (!membership) {
    throw new AppError("Workspace not found.", 404);
  }

  if (String(membership.status || "").trim().toLowerCase() !== "active") {
    throw new AppError("Your workspace access is inactive.", 403);
  }

  return {
    workspaceId: normalizedWorkspaceId,
    workspace,
    membership,
  };
};

const attachWorkspaceAccess = (request, access) => {
  request.workspaceId = access.workspaceId;
  request.workspace = access.workspace;
  request.workspaceMembership = access.membership;
};

const requireActiveWorkspaceUser = async (request, _response, next) => {
  try {
    const access = await assertActiveWorkspaceAccess(
      request.params.workspaceId,
      request.user.sub
    );
    attachWorkspaceAccess(request, access);
    next();
  } catch (error) {
    next(error);
  }
};

const buildWorkspaceAccessMiddleware = ({ getWorkspaceId, optional = false }) =>
  async (request, _response, next) => {
    try {
      const workspaceId = getWorkspaceId(request);

      if (
        optional &&
        (workspaceId === null || workspaceId === undefined || String(workspaceId).trim() === "")
      ) {
        next();
        return;
      }

      const access = await assertActiveWorkspaceAccess(workspaceId, request.user.sub);
      attachWorkspaceAccess(request, access);
      next();
    } catch (error) {
      next(error);
    }
  };

const requireActiveWorkspaceUserFromQuery = buildWorkspaceAccessMiddleware({
  getWorkspaceId: (request) => request.query.workspaceId,
});

const requireActiveWorkspaceUserFromQueryWhenPresent = buildWorkspaceAccessMiddleware({
  getWorkspaceId: (request) => request.query.workspaceId,
  optional: true,
});

const requireActiveWorkspaceUserFromBody = buildWorkspaceAccessMiddleware({
  getWorkspaceId: (request) => request.body.workspaceId,
});

const requireActiveWorkspaceUserByProjectId = async (request, _response, next) => {
  try {
    const projectIdSource =
      request.params.projectId ?? request.query.projectId ?? request.body.projectId;
    const normalizedProjectId = Number(projectIdSource);

    if (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0) {
      throw new AppError("Please provide a valid project id.", 400);
    }

    const project = await projectRepository.findById(normalizedProjectId);

    if (!project) {
      throw new AppError("Project not found.", 404);
    }

    const access = await assertActiveWorkspaceAccess(
      project.workspace_id ?? project.workspaceId,
      request.user.sub
    );

    request.project = project;
    attachWorkspaceAccess(request, access);
    next();
  } catch (error) {
    next(error);
  }
};

const requireActiveWorkspaceUserByProjectSlug = async (request, _response, next) => {
  try {
    const projectSlug = String(request.params.projectSlug || "").trim();
    const workspaceId = request.query.workspaceId;

    if (!projectSlug) {
      throw new AppError("Please provide a valid project slug.", 400);
    }

    const project = await projectRepository.findBySlug(projectSlug, workspaceId || null);

    if (!project) {
      throw new AppError("Project not found.", 404);
    }

    const access = await assertActiveWorkspaceAccess(
      project.workspace_id ?? project.workspaceId,
      request.user.sub
    );

    request.project = project;
    attachWorkspaceAccess(request, access);
    next();
  } catch (error) {
    next(error);
  }
};

const requireActiveWorkspaceUserByTaskId = async (request, _response, next) => {
  try {
    const normalizedTaskId = Number(request.params.taskId);

    if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
      throw new AppError("Please provide a valid task id.", 400);
    }

    const task = await taskRepository.findById(normalizedTaskId);

    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const access = await assertActiveWorkspaceAccess(
      task.workspace_id ?? task.workspaceId,
      request.user.sub
    );

    request.task = task;
    attachWorkspaceAccess(request, access);
    next();
  } catch (error) {
    next(error);
  }
};

const requireActiveWorkspaceUserByTaskSlug = async (request, _response, next) => {
  try {
    const taskSlug = String(request.params.taskSlug || "").trim();
    const projectId = request.query.projectId;

    if (!taskSlug) {
      throw new AppError("Please provide a valid task slug.", 400);
    }

    const task = await taskRepository.findBySlug(taskSlug, projectId || null);

    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const access = await assertActiveWorkspaceAccess(
      task.workspace_id ?? task.workspaceId,
      request.user.sub
    );

    request.task = task;
    attachWorkspaceAccess(request, access);
    next();
  } catch (error) {
    next(error);
  }
};

const requireWorkspaceOwner = (request, _response, next) => {
  const role = String(request.workspaceMembership?.role || "")
    .trim()
    .toLowerCase();

  if (role !== "owner") {
    next(new AppError("Only the workspace owner can access this resource.", 403));
    return;
  }

  next();
};

const requireWorkspaceOwnerOrAdmin = (request, _response, next) => {
  const role = String(request.workspaceMembership?.role || "")
    .trim()
    .toLowerCase();

  if (role !== "owner" && role !== "admin") {
    next(new AppError("Only workspace owners and admins can access this resource.", 403));
    return;
  }

  next();
};

module.exports = {
  requireActiveWorkspaceUser,
  requireActiveWorkspaceUserByProjectId,
  requireActiveWorkspaceUserByProjectSlug,
  requireActiveWorkspaceUserByTaskId,
  requireActiveWorkspaceUserByTaskSlug,
  requireActiveWorkspaceUserFromBody,
  requireActiveWorkspaceUserFromQuery,
  requireActiveWorkspaceUserFromQueryWhenPresent,
  requireWorkspaceOwner,
  requireWorkspaceOwnerOrAdmin,
};
