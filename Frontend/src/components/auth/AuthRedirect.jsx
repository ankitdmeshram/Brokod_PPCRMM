import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { APP_ROUTES } from "../../router/authRoutes";

export default function AuthRedirect({ children }) {
  const { isAuthenticated } = useAuthContext();

  if (isAuthenticated) {
    return <Navigate to={APP_ROUTES.workspace} replace />;
  }

  return children;
}
