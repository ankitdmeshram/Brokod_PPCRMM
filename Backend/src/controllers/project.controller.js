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
  const projects = await projectService.getProjects(request.user.sub);

  response.status(200).json({
    projects,
  });
});

const getProjectById = asyncHandler(async (request, response) => {
  const project = await projectService.getProjectById(request.params.projectId, request.user.sub);

  response.status(200).json({
    project,
  });
});

const getProjectUsers = asyncHandler(async (request, response) => {
  const result = await projectService.getProjectUsers(request.params.projectId, request.user.sub);

  response.status(200).json(result);
});

const updateProject = asyncHandler(async (request, response) => {
  const project = await projectService.updateProject(
    request.params.projectId,
    request.body,
    request.user.sub
  );

  response.status(200).json({
    message: "Project updated successfully.",
    project,
  });
});

const deleteProject = asyncHandler(async (request, response) => {
  await projectService.deleteProject(request.params.projectId, request.user.sub);

  response.status(200).json({
    message: "Project deleted successfully.",
  });
});

module.exports = {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  getProjectUsers,
  updateProject,
};
