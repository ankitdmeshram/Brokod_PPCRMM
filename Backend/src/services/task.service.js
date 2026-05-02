const { getDb } = require("../config/database");
const projectRepository = require("../repositories/project.repository");
const taskActivityLogRepository = require("../repositories/task-activity-log.repository");
const taskCommentRepository = require("../repositories/task-comment.repository");
const taskRepository = require("../repositories/task.repository");
const userRepository = require("../repositories/user.repository");
const workspaceRepository = require("../repositories/workspace.repository");
const AppError = require("../utils/app-error");
const {
  validateCreateTaskPayload,
  validateGetTasksFilters,
  validateTaskId,
  validateUpdateTaskPayload,
} = require("../validators/task.validator");

const isSuperAdmin = (role = "") =>
  String(role).trim().toLowerCase() === "super-admin";

const mapTask = (task) => ({
  id: task.id,
  projectId: task.project_id ?? task.projectId,
  workspaceId: task.workspace_id ?? task.workspaceId,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assignedBy: task.assigned_by ?? task.assignedBy ?? null,
  assignedTo: task.assigned_to ?? task.assignedTo ?? null,
  createdBy: task.created_by ?? task.createdBy,
  startDate: task.start_date ?? task.startDate ?? null,
  dueDate: task.due_date ?? task.dueDate ?? null,
  completedAt: task.completed_at ?? task.completedAt ?? null,
  taskType: task.task_type ?? task.taskType,
  tags:
    typeof task.tags === "string"
      ? JSON.parse(task.tags || "[]")
      : Array.isArray(task.tags)
        ? task.tags
        : [],
  assignedByName:
    `${String(task.assigned_by_first_name || "").trim()} ${String(task.assigned_by_last_name || "").trim()}`.trim() ||
    task.assigned_by_email ||
    null,
  assignedToName:
    `${String(task.assigned_to_first_name || "").trim()} ${String(task.assigned_to_last_name || "").trim()}`.trim() ||
    task.assigned_to_email ||
    null,
  createdByName:
    `${String(task.created_by_first_name || "").trim()} ${String(task.created_by_last_name || "").trim()}`.trim() ||
    task.created_by_email ||
    null,
  commentsCount: Number(task.comments_count || task.commentsCount || 0),
  activityLogsCount: Number(task.activity_logs_count || task.activityLogsCount || 0),
  createdAt: task.created_at ?? task.createdAt ?? null,
  updatedAt: task.updated_at ?? task.updatedAt ?? null,
  deletedAt: task.deleted_at ?? task.deletedAt ?? null,
  deletedBy: task.deleted_by ?? task.deletedBy ?? null,
});

const assertUserExists = async (userId, label) => {
  if (userId === null || userId === undefined) {
    return;
  }

  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError(`${label} user not found.`, 404);
  }
};

const createTask = async (payload, userId, userRole = "") => {
  const {
    projectId,
    workspaceId,
    title,
    description,
    status,
    priority,
    assignedBy,
    assignedTo,
    startDate,
    dueDate,
    completedAt,
    taskType,
    tags,
    initialComment,
    initialActivityLog,
  } = validateCreateTaskPayload(payload);

  const [project, workspace] = await Promise.all([
    isSuperAdmin(userRole)
      ? projectRepository.findById(projectId)
      : projectRepository.findByIdForUser(projectId, userId),
    isSuperAdmin(userRole)
      ? workspaceRepository.findById(workspaceId)
      : workspaceRepository.findByIdForUser(workspaceId, userId),
  ]);

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  if (!workspace) {
    throw new AppError("Workspace not found.", 404);
  }

  if (Number(project.workspace_id ?? project.workspaceId) !== workspaceId) {
    throw new AppError("projectId does not belong to the provided workspaceId.", 400);
  }

  const resolvedAssignedBy = assignedBy ?? Number(userId);

  await Promise.all([
    assertUserExists(resolvedAssignedBy, "assignedBy"),
    assertUserExists(assignedTo, "assignedTo"),
  ]);

  const task = await getDb().transaction(async (trx) => {
    const taskId = await taskRepository.create(
      {
        projectId,
        workspaceId,
        title,
        description,
        status,
        priority,
        assignedBy: resolvedAssignedBy,
        assignedTo,
        createdBy: userId,
        startDate,
        dueDate,
        completedAt,
        taskType,
        tags,
      },
      trx
    );

    if (initialComment) {
      await taskCommentRepository.create(
        {
          taskId,
          comment: initialComment,
          createdBy: userId,
        },
        trx
      );
    }

    if (initialActivityLog) {
      await taskActivityLogRepository.create(
        {
          taskId,
          activity: initialActivityLog,
          createdBy: userId,
        },
        trx
      );
    }

    return taskRepository.findById(taskId, trx);
  });

  return mapTask(task);
};

const getTasks = async (filters = {}, userId, userRole = "") => {
  const {
    projectId,
    workspaceId,
    search,
    page,
    limit,
    offset,
  } = validateGetTasksFilters(filters);

  const project = isSuperAdmin(userRole)
    ? await projectRepository.findById(projectId)
    : await projectRepository.findByIdForUser(projectId, userId);

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  const resolvedWorkspaceId = Number(project.workspace_id ?? project.workspaceId);

  if (workspaceId !== null && resolvedWorkspaceId !== workspaceId) {
    throw new AppError("projectId does not belong to the provided workspaceId.", 400);
  }

  const [tasks, total] = await Promise.all([
    taskRepository.findAll({
      projectId,
      workspaceId: workspaceId ?? resolvedWorkspaceId,
      search,
      limit,
      offset,
    }),
    taskRepository.countAll({
      projectId,
      workspaceId: workspaceId ?? resolvedWorkspaceId,
      search,
    }),
  ]);

  return {
    tasks: tasks.map(mapTask),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getTaskById = async (taskId, userId, userRole = "") => {
  const normalizedTaskId = validateTaskId(taskId);

  const task = await taskRepository.findById(normalizedTaskId);

  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  const project = isSuperAdmin(userRole)
    ? await projectRepository.findById(Number(task.project_id ?? task.projectId))
    : await projectRepository.findByIdForUser(
        Number(task.project_id ?? task.projectId),
        userId
      );

  if (!project) {
    throw new AppError("Task not found.", 404);
  }

  return mapTask(task);
};

const updateTask = async (taskId, payload, userId, userRole = "") => {
  const normalizedTaskId = validateTaskId(taskId);
  const updates = validateUpdateTaskPayload(payload);

  const task = await taskRepository.findById(normalizedTaskId);

  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  const project = isSuperAdmin(userRole)
    ? await projectRepository.findById(Number(task.project_id ?? task.projectId))
    : await projectRepository.findByIdForUser(
        Number(task.project_id ?? task.projectId),
        userId
      );

  if (!project) {
    throw new AppError("Task not found.", 404);
  }

  if (!isSuperAdmin(userRole)) {
    const isOwner = String(project.membership_role || "").toLowerCase() === "owner";
    const isCreator = Number(task.created_by ?? task.createdBy) === Number(userId);

    if (!isOwner && !isCreator) {
      throw new AppError("Only the task creator or project owner can update this task.", 403);
    }
  }

  await Promise.all([
    assertUserExists(updates.assignedBy, "assignedBy"),
    assertUserExists(updates.assignedTo, "assignedTo"),
  ]);

  await taskRepository.updateById(normalizedTaskId, updates);

  const updatedTask = await taskRepository.findById(normalizedTaskId);
  return mapTask(updatedTask);
};

const deleteTask = async (taskId, userId, userRole = "") => {
  const normalizedTaskId = validateTaskId(taskId);

  const task = await taskRepository.findById(normalizedTaskId);

  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  if (isSuperAdmin(userRole)) {
    await taskRepository.softDeleteById(normalizedTaskId, userId);
    return;
  }

  const project = await projectRepository.findByIdForUser(
    Number(task.project_id ?? task.projectId),
    userId
  );

  if (!project) {
    throw new AppError("Task not found.", 404);
  }

  const isOwner = String(project.membership_role || "").toLowerCase() === "owner";
  const isCreator = Number(task.created_by ?? task.createdBy) === Number(userId);

  if (!isOwner && !isCreator) {
    throw new AppError("Only the task creator or project owner can delete this task.", 403);
  }

  await taskRepository.softDeleteById(normalizedTaskId, userId);
};

module.exports = {
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateTask,
};
