import { CssVarsProvider } from "@mui/joy";
import CssBaseline from "@mui/joy/CssBaseline";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthRedirect from "./components/auth/AuthRedirect";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import SuperAdminProjectsPage from "./pages/SuperAdminProjectsPage";
import WorkspacePage from "./pages/WorkspacePage";
import WorkspaceProjectsPage from "./pages/WorkspaceProjectsPage";
import { APP_ROUTES, AUTH_ROUTES, SUPER_ADMIN_ROUTES } from "./router/authRoutes";
import { joyTheme } from "./theme/joyTheme";

export default function App() {
  return (
    <CssVarsProvider theme={joyTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route
            path={AUTH_ROUTES.signIn}
            element={
              <AuthRedirect>
                <AuthPage mode="signin" />
              </AuthRedirect>
            }
          />
          <Route
            path={AUTH_ROUTES.signUp}
            element={
              <AuthRedirect>
                <AuthPage mode="signup" />
              </AuthRedirect>
            }
          />
          <Route
            path={APP_ROUTES.workspace}
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceName/projects`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={SUPER_ADMIN_ROUTES.overview}
            element={
              <ProtectedRoute requireSuperAdmin>
                <SuperAdminProjectsPage section="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path={SUPER_ADMIN_ROUTES.users}
            element={
              <ProtectedRoute requireSuperAdmin>
                <SuperAdminProjectsPage section="users" />
              </ProtectedRoute>
            }
          />
          <Route
            path={SUPER_ADMIN_ROUTES.settings}
            element={
              <ProtectedRoute requireSuperAdmin>
                <SuperAdminProjectsPage section="settings" />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={AUTH_ROUTES.signIn} replace />} />
        </Routes>
      </AuthProvider>
    </CssVarsProvider>
  );
}
