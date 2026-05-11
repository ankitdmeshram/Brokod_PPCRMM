import { CssVarsProvider } from "@mui/joy";
import CssBaseline from "@mui/joy/CssBaseline";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthRedirect from "./components/auth/AuthRedirect";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import SuperAdminProjectsPage from "./pages/SuperAdminProjectsPage";
import WorkspaceTaskDetailsPage from "./pages/WorkspaceTaskDetailsPage";
import WorkspaceProjectTasksPage from "./pages/WorkspaceProjectTasksPage";
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
            path={`${APP_ROUTES.workspace}/:workspaceSlug/overview`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="projects" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/users`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="users" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/overview`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/tasks`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="tasks" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/users`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="users" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/task/:taskSlug`}
            element={
              <ProtectedRoute>
                <WorkspaceTaskDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/notifications`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="notifications" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/settings`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="settings" />
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
