import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { APP_ROUTES } from "../../router/authRoutes";

const AUTH_SIGN_IN_PATH = "/auth/signin";

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { authSession, isAuthenticated } = useAuthContext();
  const isSuperAdmin =
    String(authSession?.user?.role || "").trim().toLowerCase() === "super-admin";

  if (!isAuthenticated) {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const signInUrl = `${AUTH_SIGN_IN_PATH}?redirect=${encodeURIComponent(currentPath)}`;
    window.location.replace(signInUrl);
    return null;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to={APP_ROUTES.workspace} replace />;
  }

  return children;
}
