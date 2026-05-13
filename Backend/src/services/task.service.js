const { getDb } = require("../config/database");
const projectRepository = require("../repositories/project.repository");
const taskActivityLogRepository = require("../repositories/task-activity-log.repository");
const taskCommentRepository = require("../repositories/task-comment.repository");
const taskRepository = require("../repositories/task.repository");
const userRepository = require("../repositories/user.repository");
const workspaceRepository = require("../repositories/workspace.repository");
const AppError = require("../utils/app-error");
const {
  validateCreateTaskCommentPayload,
  validateCreateTaskPayload,
  validateExportTasksFilters,
  validateGetTasksFilters,
  validateImportTasksPayload,
  validateTaskId,
  validateUpdateTaskPayload,
} = require("../validators/task.validator");

const isSuperAdmin = (role = "") =>
  String(role).trim().toLowerCase() === "super-admin";

const sanitizeFileNamePart = (value, fallback) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
};

const mapTask = (task) => ({
  id: task.id,
  projectId: task.project_id ?? task.projectId,
  projectTaskNumber: task.project_task_number ?? task.projectTaskNumber ?? null,
  parentTaskId: task.parent_task_id ?? task.parentTaskId ?? null,
  workspaceId: task.workspace_id ?? task.workspaceId,
  title: task.title,
  slug: task.slug ?? null,
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
  parentTaskTitle: task.parent_task_title ?? task.parentTaskTitle ?? null,
  parentTaskSlug: task.parent_task_slug ?? task.parentTaskSlug ?? null,
  parentTaskProjectTaskNumber:
    task.parent_task_project_task_number ?? task.parentTaskProjectTaskNumber ?? null,
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
  subtasksCount: Number(task.subtasks_count || task.subtasksCount || 0),
  createdAt: task.created_at ?? task.createdAt ?? null,
  updatedAt: task.updated_at ?? task.updatedAt ?? null,
  deletedAt: task.deleted_at ?? task.deletedAt ?? null,
  deletedBy: task.deleted_by ?? task.deletedBy ?? null,
});

const mapTaskComment = (comment) => ({
  id: comment.id,
  taskId: comment.task_id ?? comment.taskId,
  comment: comment.comment,
  createdBy: comment.created_by ?? comment.createdBy,
  createdByName:
    `${String(comment.created_by_first_name || "").trim()} ${String(comment.created_by_last_name || "").trim()}`.trim() ||
    comment.created_by_email ||
    null,
  createdAt: comment.created_at ?? comment.createdAt ?? null,
  updatedAt: comment.updated_at ?? comment.updatedAt ?? null,
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

const buildRandomTaskSlug = () => {
  const timestamp = Date.now();
  const randomNumber = Math.floor(Math.random() * 100000) + 1;

  return `${timestamp}-${randomNumber}`;
};

const buildUniqueTaskSlug = async (projectId, trx = getDb()) => {
  let candidateSlug = buildRandomTaskSlug();

  while (true) {
    const existingTask = await taskRepository.findBySlug(candidateSlug, projectId, trx);

    if (!existingTask) {
      return candidateSlug;
    }

    candidateSlug = buildRandomTaskSlug();
  }
};

const assertParentTaskValid = async (
  parentTaskId,
  { projectId, workspaceId, currentTaskId = null },
  trx = getDb()
) => {
  if (parentTaskId === null || parentTaskId === undefined) {
    return null;
  }

  const normalizedParentTaskId = Number(parentTaskId);

  if (currentTaskId !== null && normalizedParentTaskId === Number(currentTaskId)) {
    throw new AppError("A task cannot be its own parent task.", 400);
  }

  const parentTask = await taskRepository.findById(normalizedParentTaskId, trx);

  if (!parentTask) {
    throw new AppError("Parent task not found.", 404);
  }

  if (
    Number(parentTask.project_id ?? parentTask.projectId) !== Number(projectId) ||
    Number(parentTask.workspace_id ?? parentTask.workspaceId) !== Number(workspaceId)
  ) {
    throw new AppError("parentTaskId must belong to the same project and workspace.", 400);
  }

  if (currentTaskId !== null) {
    const visitedTaskIds = new Set([normalizedParentTaskId]);
    let ancestorTask = parentTask;

    while (ancestorTask) {
      const ancestorParentTaskId = ancestorTask.parent_task_id ?? ancestorTask.parentTaskId;

      if (ancestorParentTaskId === null || ancestorParentTaskId === undefined) {
        break;
      }

      if (Number(ancestorParentTaskId) === Number(currentTaskId)) {
        throw new AppError("A task cannot be nested under one of its subtasks.", 400);
      }

      if (visitedTaskIds.has(Number(ancestorParentTaskId))) {
        break;
      }

      visitedTaskIds.add(Number(ancestorParentTaskId));
      ancestorTask = await taskRepository.findById(Number(ancestorParentTaskId), trx);
    }
  }

  return normalizedParentTaskId;
};

const createTaskRecord = async (
  {
    projectId,
    workspaceId,
    parentTaskId,
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
  },
  userId,
  trx
) => {
  const slug = await buildUniqueTaskSlug(projectId, trx);
  const projectTaskNumber = await taskRepository.getNextProjectTaskNumber(projectId, trx);
  const taskId = await taskRepository.create(
    {
      projectId,
    projectTaskNumber,
    parentTaskId,
    workspaceId,
      title,
      slug,
      description,
      status,
      priority,
      assignedBy,
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
};

const createTask = async (payload, userId, userRole = "") => {
  const {
    projectId,
    workspaceId,
    parentTaskId,
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

  const resolvedParentTaskId = await assertParentTaskValid(
    parentTaskId,
    { projectId, workspaceId }
  );

  const task = await getDb().transaction(async (trx) => {
    return createTaskRecord(
      {
        projectId,
        workspaceId,
        parentTaskId: resolvedParentTaskId,
        title,
        description,
        status,
        priority,
        assignedBy: resolvedAssignedBy,
        assignedTo,
        startDate,
        dueDate,
        completedAt,
        taskType,
        tags,
        initialComment,
        initialActivityLog,
      },
      userId,
      trx
    );
  });

  return mapTask(task);
};

const getTasks = async (filters = {}, userId, userRole = "") => {
  const {
    projectId,
    workspaceId,
    search,
    id,
    title,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedBy,
    tags,
    updatedAt,
    createdAt,
    advancedFilters,
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
      id,
      title,
      status,
      priority,
      dueDate,
      assignedTo,
      assignedBy,
      tags,
      updatedAt,
      createdAt,
      advancedFilters,
      limit,
      offset,
    }),
    taskRepository.countAll({
      projectId,
      workspaceId: workspaceId ?? resolvedWorkspaceId,
      search,
      id,
      title,
      status,
      priority,
      dueDate,
      assignedTo,
      assignedBy,
      tags,
      updatedAt,
      createdAt,
      advancedFilters,
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

const exportTasks = async (filters = {}, userId, userRole = "") => {
  const {
    projectId,
    workspaceId,
    search,
    id,
    title,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedBy,
    tags,
    updatedAt,
    createdAt,
    advancedFilters,
  } = validateExportTasksFilters(filters);

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

  const tasks = await taskRepository.findAll({
    projectId,
    workspaceId: workspaceId ?? resolvedWorkspaceId,
    search,
    id,
    title,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedBy,
    tags,
    updatedAt,
    createdAt,
    advancedFilters,
  });

  return {
    fileName: `${sanitizeFileNamePart(project.project_name ?? project.projectName, "project")}-tasks.json`,
    content: {
      project: {
        id: Number(project.id),
        name: project.project_name ?? project.projectName ?? null,
        slug: project.slug ?? null,
        workspaceId: resolvedWorkspaceId,
        workspaceSlug: project.workspace_slug ?? project.workspaceSlug ?? null,
      },
      filters: {
        projectId,
        workspaceId: workspaceId ?? resolvedWorkspaceId,
        search,
        id,
        title,
        status,
        priority,
        dueDate,
        assignedTo,
        assignedBy,
        tags,
        updatedAt,
        createdAt,
        advancedFilters,
      },
      exportedAt: new Date().toISOString(),
      total: tasks.length,
      tasks: tasks.map(mapTask),
    },
  };
};

const importTasks = async (payload = {}, userId, userRole = "") => {
  const {
    projectId,
    workspaceId,
    tasks,
  } = validateImportTasksPayload(payload);

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

  const importedTasks = await getDb().transaction(async (trx) => {
    const createdTasks = [];

    for (let index = 0; index < tasks.length; index += 1) {
      const sourceTask = tasks[index] || {};
      let normalizedTaskPayload;

      try {
        normalizedTaskPayload = validateCreateTaskPayload({
          title: sourceTask.title,
          description: sourceTask.description,
          status: sourceTask.status,
          priority: sourceTask.priority,
          taskType: sourceTask.taskType,
          assignedBy: sourceTask.assignedBy,
          assignedTo: sourceTask.assignedTo,
          projectId,
          workspaceId: resolvedWorkspaceId,
          startDate: sourceTask.startDate,
          dueDate: sourceTask.dueDate,
          completedDate: sourceTask.completedAt || sourceTask.completedDate,
          tags: sourceTask.tags,
          parentTaskId: null,
          comments: sourceTask.initialComment || "",
          activityLogs: sourceTask.initialActivityLog || "",
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw new AppError(`Task ${index + 1}: ${error.message}`, error.statusCode);
        }

        throw error;
      }

      const resolvedAssignedBy = normalizedTaskPayload.assignedBy ?? Number(userId);

      await Promise.all([
        assertUserExists(resolvedAssignedBy, "assignedBy"),
        assertUserExists(normalizedTaskPayload.assignedTo, "assignedTo"),
      ]);

      const createdTask = await createTaskRecord(
        {
          ...normalizedTaskPayload,
          projectId,
          workspaceId: resolvedWorkspaceId,
          assignedBy: resolvedAssignedBy,
        },
        userId,
        trx
      );

      createdTasks.push(mapTask(createdTask));
    }

    return createdTasks;
  });

  return {
    count: importedTasks.length,
    tasks: importedTasks,
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

const getTaskBySlug = async (taskSlug, userId, userRole = "", projectId = null) => {
  const normalizedTaskSlug = String(taskSlug || "").trim();
  const normalizedProjectId =
    projectId === null || projectId === undefined || projectId === ""
      ? null
      : Number(projectId);

  if (!normalizedTaskSlug) {
    throw new AppError("Please provide a valid task slug.", 400);
  }

  if (
    normalizedProjectId !== null &&
    (!Number.isInteger(normalizedProjectId) || normalizedProjectId <= 0)
  ) {
    throw new AppError("Please provide a valid project id.", 400);
  }

  const task = await taskRepository.findBySlug(normalizedTaskSlug, normalizedProjectId);

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

const getTaskComments = async (taskId, userId, userRole = "") => {
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

  const comments = await taskCommentRepository.findByTaskId(normalizedTaskId);
  return comments.map(mapTaskComment);
};

const createTaskComment = async (taskId, payload, userId, userRole = "") => {
  const normalizedTaskId = validateTaskId(taskId);
  const { comment } = validateCreateTaskCommentPayload(payload);

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

  const commentId = await taskCommentRepository.create({
    taskId: normalizedTaskId,
    comment,
    createdBy: userId,
  });

  const createdComment = await taskCommentRepository.findById(commentId);

  if (!createdComment) {
    throw new AppError("Unable to create task comment.", 500);
  }

  return mapTaskComment(createdComment);
};

const updateTaskComment = async (taskId, commentId, payload, userId, userRole = "") => {
  const normalizedTaskId = validateTaskId(taskId);
  const normalizedCommentId = validateTaskId(commentId);
  const { comment } = validateCreateTaskCommentPayload(payload);

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

  const existingComment = await taskCommentRepository.findById(normalizedCommentId);

  if (!existingComment || Number(existingComment.task_id ?? existingComment.taskId) !== normalizedTaskId) {
    throw new AppError("Comment not found.", 404);
  }

  if (!isSuperAdmin(userRole)) {
    const isOwner = String(project.membership_role || "").toLowerCase() === "owner";
    const isCommentCreator =
      Number(existingComment.created_by ?? existingComment.createdBy) === Number(userId);

    if (!isOwner && !isCommentCreator) {
      throw new AppError("Only the comment creator or project owner can update this comment.", 403);
    }
  }

  await taskCommentRepository.updateById({
    id: normalizedCommentId,
    taskId: normalizedTaskId,
    comment,
  });

  const updatedComment = await taskCommentRepository.findById(normalizedCommentId);

  if (!updatedComment) {
    throw new AppError("Unable to update task comment.", 500);
  }

  return mapTaskComment(updatedComment);
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

  const resolvedParentTaskId = await assertParentTaskValid(
    updates.parentTaskId,
    {
      projectId: Number(task.project_id ?? task.projectId),
      workspaceId: Number(task.workspace_id ?? task.workspaceId),
      currentTaskId: normalizedTaskId,
    }
  );

  await taskRepository.updateById(normalizedTaskId, {
    ...updates,
    parentTaskId: resolvedParentTaskId,
    slug: task.slug,
  });

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
  createTaskComment,
  createTask,
  deleteTask,
  exportTasks,
  importTasks,
  getTaskComments,
  getTaskById,
  getTaskBySlug,
  getTasks,
  updateTaskComment,
  updateTask,
};
