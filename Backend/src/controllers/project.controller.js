const asyncHandler = require("../middlewares/async-handler.middleware");
const projectService = require("../services/project.service");

const createProject = asyncHandler(async (request, response) => {
  const project = await projectService.createProject(request.body, request.user.sub);

  response.status(201).json({
    message: "Project created successfully.",
    project,
  });
});

const getProjects = asyncHandler(async (request, response) => {
  const result = await projectService.getProjects(
    request.user.sub,
    {
      workspaceId: request.query.workspaceId,
      search: request.query.search,
      page: request.query.page,
      limit: request.query.limit,
    },
    request.user.role
  );

  response.status(200).json({
    projects: result.projects,
    pagination: result.pagination,
  });
});

const getProjectById = asyncHandler(async (request, response) => {
  const project = await projectService.getProjectById(
    request.params.projectId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    project,
  });
});

const getProjectBySlug = asyncHandler(async (request, response) => {
  const project = await projectService.getProjectBySlug(
    request.params.projectSlug,
    request.user.sub,
    request.user.role,
    request.query.workspaceId
  );

  response.status(200).json({
    project,
  });
});

const getProjectUsers = asyncHandler(async (request, response) => {
  const result = await projectService.getProjectUsers(
    request.params.projectId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json(result);
});

const updateProject = asyncHandler(async (request, response) => {
  const project = await projectService.updateProject(
    request.params.projectId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Project updated successfully.",
    project,
  });
});

const deleteProject = asyncHandler(async (request, response) => {
  await projectService.deleteProject(
    request.params.projectId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Project deleted successfully.",
  });
});

module.exports = {
  createProject,
  deleteProject,
  getProjectById,
  getProjectBySlug,
  getProjects,
  getProjectUsers,
  updateProject,
};
