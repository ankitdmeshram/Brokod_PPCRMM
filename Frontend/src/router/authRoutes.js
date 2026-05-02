export const AUTH_ROUTES = {
  signIn: "/signin",
  signUp: "/signup",
};

export const APP_ROUTES = {
  workspace: "/workspace",
  superAdmin: "/super-admin",
};

export const SUPER_ADMIN_ROUTES = {
  overview: APP_ROUTES.superAdmin,
  users: `${APP_ROUTES.superAdmin}/users`,
  settings: `${APP_ROUTES.superAdmin}/settings`,
};

export const slugifyRouteSegment = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const buildWorkspaceProjectsRoute = (workspaceSlug) =>
  `/workspace/${workspaceSlug}/projects`;

export const buildProjectRouteSegment = (projectName, projectId) =>
  `${slugifyRouteSegment(projectName)}-${projectId}`;

export const buildProjectSectionRoute = (workspaceSlug, projectRouteSegment, section) =>
  `/workspace/${workspaceSlug}/projects/${projectRouteSegment}/${section}`;

export const buildProjectTasksRoute = (workspaceSlug, projectName, projectId) =>
  buildProjectSectionRoute(
    workspaceSlug,
    buildProjectRouteSegment(projectName, projectId),
    "tasks"
  );
