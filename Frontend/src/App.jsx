import { CssVarsProvider } from "@mui/joy";
import CssBaseline from "@mui/joy/CssBaseline";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import SuperAdminProjectsPage from "./pages/SuperAdminProjectsPage";
import ProfilePage from "./pages/ProfilePage";
import WorkspaceTaskDetailsPage from "./pages/WorkspaceTaskDetailsPage";
import WorkspaceProjectTasksPage from "./pages/WorkspaceProjectTasksPage";
import WorkspacePage from "./pages/WorkspacePage";
import WorkspaceProjectsPage from "./pages/WorkspaceProjectsPage";
import { APP_ROUTES, SUPER_ADMIN_ROUTES } from "./router/authRoutes";
import { joyTheme } from "./theme/joyTheme";

export default function App() {
  return (
    <CssVarsProvider theme={joyTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route
            path={APP_ROUTES.myAccount}
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
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
            path={`${APP_ROUTES.workspace}/:workspaceSlug/applications`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="applications" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/overview`}
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
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/tasks`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="tasks" />
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
            path={`${APP_ROUTES.workspace}/:workspaceSlug/notifications`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="notifications" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/audit-logs`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="auditLogs" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/settings/access`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="settingsAccess" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/settings/roles`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="settingsRoles" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/settings/workspace`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="settingsWorkspace" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/calendar`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="calendar" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/notifications`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="projectNotifications" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/users`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="projectUsers" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/activity-logs`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="activityLogs" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/settings`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectsPage section="appSettings" />
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
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/calendar`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="calendar" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/documents`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="documents" />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/:workspaceSlug/projects/:projectSlug/activity-logs`}
            element={
              <ProtectedRoute>
                <WorkspaceProjectTasksPage section="activityLogs" />
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
            path={SUPER_ADMIN_ROUTES.authActivities}
            element={
              <ProtectedRoute requireSuperAdmin>
                <SuperAdminProjectsPage section="authActivities" />
              </ProtectedRoute>
            }
          />
          <Route
            path={SUPER_ADMIN_ROUTES.backup}
            element={
              <ProtectedRoute requireSuperAdmin>
                <SuperAdminProjectsPage section="backup" />
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
          <Route path="*" element={<Navigate to={APP_ROUTES.workspace} replace />} />
        </Routes>
      </AuthProvider>
    </CssVarsProvider>
  );
}
