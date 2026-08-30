const asyncHandler = require("../middlewares/async-handler.middleware");
const projectService = require("../services/project.service");

const createProject = asyncHandler(async (request, response) => {
  const project = await projectService.createProject(
    request.body,
    request.user.sub,
    request.user.role
  );

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

const addProjectUser = asyncHandler(async (request, response) => {
  const result = await projectService.addProjectUser(
    request.params.projectId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(201).json({
    message: "Project user added successfully.",
    ...result,
  });
});

const updateProjectUser = asyncHandler(async (request, response) => {
  const user = await projectService.updateProjectUser(
    request.params.projectId,
    request.params.userId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Project user updated successfully.",
    user,
  });
});

const deleteProjectUser = asyncHandler(async (request, response) => {
  await projectService.deleteProjectUser(
    request.params.projectId,
    request.params.userId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Project user removed successfully.",
  });
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

const updateProjectTaskColumns = asyncHandler(async (request, response) => {
  const project = await projectService.updateProjectTaskColumns(
    request.params.projectId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Task list columns updated successfully.",
    project,
  });
});

const getProjectCustomFields = asyncHandler(async (request, response) => {
  const customFields = await projectService.getProjectCustomFields(
    request.params.projectId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({ customFields });
});

const createProjectCustomField = asyncHandler(async (request, response) => {
  const customField = await projectService.createProjectCustomField(
    request.params.projectId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(201).json({
    message: "Custom field created successfully.",
    customField,
  });
});

const updateProjectCustomField = asyncHandler(async (request, response) => {
  const customField = await projectService.updateProjectCustomField(
    request.params.projectId,
    request.params.fieldId,
    request.body,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Custom field updated successfully.",
    customField,
  });
});

const deleteProjectCustomField = asyncHandler(async (request, response) => {
  await projectService.deleteProjectCustomField(
    request.params.projectId,
    request.params.fieldId,
    request.user.sub,
    request.user.role
  );

  response.status(200).json({
    message: "Custom field deleted successfully.",
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
