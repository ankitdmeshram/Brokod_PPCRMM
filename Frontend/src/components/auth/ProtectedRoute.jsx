import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { AUTH_ROUTES } from "../../router/authRoutes";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.signIn} replace />;
  }

  return children;
}
