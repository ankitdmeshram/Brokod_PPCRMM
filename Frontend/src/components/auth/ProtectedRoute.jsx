import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { APP_ROUTES, AUTH_ROUTES } from "../../router/authRoutes";

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { authSession, isAuthenticated } = useAuthContext();
  const isSuperAdmin =
    String(authSession?.user?.role || "").trim().toLowerCase() === "super-admin";

  if (!isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.signIn} replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to={APP_ROUTES.workspace} replace />;
  }

  return children;
}
