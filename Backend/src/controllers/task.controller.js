const asyncHandler = require("../middlewares/async-handler.middleware");
const taskService = require("../services/task.service");

const createTask = asyncHandler(async (request, response) => {
  const task = await taskService.createTask(
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(201).json({
    message: "Task created successfully.",
    task,
  });
});

const getTasks = asyncHandler(async (request, response) => {
  const result = await taskService.getTasks(
    {
      projectId: request.query.projectId,
      workspaceId: request.query.workspaceId,
      search: request.query.search,
      page: request.query.page,
      limit: request.query.limit,
    },
    request.user.sub,
    request.user.role
  );

  response.status(200).json(result);
});

const exportTasks = asyncHandler(async (request, response) => {
  const result = await taskService.exportTasks(
    {
      projectId: request.query.projectId,
      workspaceId: request.query.workspaceId,
      search: request.query.search,
    },
    request.user.sub,
    request.user.role
  );

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  response.status(200).send(JSON.stringify(result.content, null, 2));
});

const importTasks = asyncHandler(async (request, response) => {
  if (!request.file) {
    response.status(400).json({
      message: "Please upload a JSON file to import tasks.",
    });
    return;
  }

  let parsedPayload;

  try {
    parsedPayload = JSON.parse(request.file.buffer.toString("utf-8"));
  } catch {
    response.status(400).json({
      message: "The uploaded file is not valid JSON.",
    });
    return;
  }

  const result = await taskService.importTasks(
    {
      projectId: request.body.projectId,
      workspaceId: request.body.workspaceId,
      tasks: parsedPayload?.tasks,
    },
    request.user.sub,
    request.user.role
  );

  response.status(201).json({
    message: `${result.count} task${result.count === 1 ? "" : "s"} imported successfully.`,
    tasks: result.tasks,
    count: result.count,
  });
});

const getTaskById = asyncHandler(async (request, response) => {
  const task = await taskService.getTaskById(
    request.params.taskId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    task,
  });
});

const getTaskBySlug = asyncHandler(async (request, response) => {
  const task = await taskService.getTaskBySlug(
    request.params.taskSlug,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    task,
  });
});

const updateTask = asyncHandler(async (request, response) => {
  const task = await taskService.updateTask(
    request.params.taskId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Task updated successfully.",
    task,
  });
});

const deleteTask = asyncHandler(async (request, response) => {
  await taskService.deleteTask(
    request.params.taskId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Task deleted successfully.",
  });
});

module.exports = {
  createTask,
  deleteTask,
  exportTasks,
  importTasks,
  getTaskById,
  getTaskBySlug,
  getTasks,
  updateTask,
};
