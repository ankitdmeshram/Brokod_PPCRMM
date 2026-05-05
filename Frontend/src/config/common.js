export const API_DOMAIN = import.meta.env.VITE_API_DOMAIN || "";
export const AUTH_API_BASE = `${API_DOMAIN}/api/auth`;
export const WORKSPACE_API_BASE = `${API_DOMAIN}/api/workspaces`;
export const PROJECT_API_BASE = `${API_DOMAIN}/api/projects`;
export const TASK_API_BASE = `${API_DOMAIN}/api/tasks`;
export const USER_API_BASE = `${API_DOMAIN}/api/users`;
export const AUTH_STORAGE_KEY = "ppcrmm_auth_session";
