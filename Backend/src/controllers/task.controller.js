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
  getTaskById,
  getTaskBySlug,
  getTasks,
  updateTask,
};
