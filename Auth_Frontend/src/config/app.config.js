export const API_DOMAIN = import.meta.env.VITE_API_DOMAIN || "";

export const AUTH_API_BASE = `${API_DOMAIN}/api/auth`;
export const AUTH_STORAGE_KEY = "ppcrmm_auth_session";
export const PRODUCT_APP_PATH =
  import.meta.env.VITE_PRODUCT_APP_PATH || "/workspace";

export const AUTH_ROUTES = {
  signIn: "/signin",
  signUp: "/signup",
};

export function getSafeProductRedirect() {
  const requestedPath = new URLSearchParams(window.location.search).get("redirect");

  if (/^\/(workspace|super-admin|my-account)(?:[/?#]|$)/.test(requestedPath || "")) {
    return requestedPath;
  }

  return PRODUCT_APP_PATH;
}
