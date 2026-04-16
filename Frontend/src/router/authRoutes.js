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

export const buildWorkspaceProjectsRoute = (workspaceName) =>
  `/workspace/${workspaceName}/projects`;
