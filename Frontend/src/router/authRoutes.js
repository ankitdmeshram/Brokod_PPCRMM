export const AUTH_ROUTES = {
  signIn: "/auth/signin",
  signUp: "/auth/signup",
};

export const APP_ROUTES = {
  workspace: "/workspace",
  superAdmin: "/super-admin",
  myAccount: "/my-account",
};

export const SUPER_ADMIN_ROUTES = {
  overview: APP_ROUTES.superAdmin,
  users: `${APP_ROUTES.superAdmin}/users`,
  backup: `${APP_ROUTES.superAdmin}/backup`,
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

export const buildWorkspaceOverviewRoute = (workspaceSlug) =>
  `/workspace/${workspaceSlug}/overview`;

export const buildWorkspaceUsersRoute = (workspaceSlug) =>
  `/workspace/${workspaceSlug}/users`;

export const buildWorkspaceNotificationsRoute = (workspaceSlug) =>
  `/workspace/${workspaceSlug}/notifications`;

export const buildProjectSectionRoute = (workspaceSlug, projectRouteSegment, section) =>
  `/workspace/${workspaceSlug}/projects/${projectRouteSegment}/${section}`;

export const buildProjectTasksRoute = (workspaceSlug, projectSlug) =>
  buildProjectSectionRoute(workspaceSlug, projectSlug, "tasks");

export const buildTaskRouteSegment = (taskSlug) =>
  String(taskSlug || "");

export const buildTaskDetailsRoute = (
  workspaceSlug,
  projectRouteSegment,
  taskSlug
) =>
  `/workspace/${workspaceSlug}/projects/${projectRouteSegment}/task/${buildTaskRouteSegment(taskSlug)}`;
