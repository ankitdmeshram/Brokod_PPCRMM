export const AUTH_ROUTES = {
  signIn: "/signin",
  signUp: "/signup",
};

export const APP_ROUTES = {
  workspace: "/workspace",
};

export const buildWorkspaceProjectsRoute = (workspaceName) =>
  `/workspace/${workspaceName}/projects`;
