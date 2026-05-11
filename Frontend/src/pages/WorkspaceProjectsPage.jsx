import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsMain from "../components/workspace/ProjectsMain";
import {
  FolderIcon,
  GridIcon,
  NotificationIcon,
  SettingsIcon,
  UsersIcon,
} from "../components/workspace/WorkspaceIcons";
import WorkspaceOverviewMain from "../components/workspace/WorkspaceOverviewMain";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildWorkspaceOverviewRoute,
  buildWorkspaceProjectsRoute,
  buildWorkspaceUsersRoute,
} from "../router/authRoutes";
import { fetchWorkspaces } from "../services/workspace.service";
import { showAccessDeniedAlert, showErrorAlert } from "../services/alert.service";
import WorkspaceUsersMain from "../components/workspace/WorkspaceUsersMain";
import { Box } from "@mui/joy";

const formatWorkspaceTitle = (workspaceName = "") =>
  workspaceName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

export default function WorkspaceProjectsPage({ section = "projects" }) {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceSlug = "" } = useParams();
  const [workspace, setWorkspace] = useState(() => location.state?.workspace || null);
  const [isResolvingWorkspace, setIsResolvingWorkspace] = useState(!location.state?.workspace);
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const workspaceTitle = useMemo(
    () => workspace?.workspaceName || formatWorkspaceTitle(workspaceSlug) || "Workspace",
    [workspace?.workspaceName, workspaceSlug]
  );
  const sidebarItems = useMemo(
    () => [
      {
        key: "overview",
        icon: <GridIcon />,
        label: "Overview",
        to: buildWorkspaceOverviewRoute(workspaceSlug),
        active: section === "overview",
      },
      {
        key: "projects",
        icon: <FolderIcon />,
        label: "Projects",
        to: buildWorkspaceProjectsRoute(workspaceSlug),
        active: section === "projects",
      },
      {
        key: "users",
        icon: <UsersIcon />,
        label: "Users",
        to: buildWorkspaceUsersRoute(workspaceSlug),
        active: section === "users",
      },
      { key: "notifications", icon: <NotificationIcon />, label: "Notifications" },
      { key: "settings", icon: <SettingsIcon />, label: "Settings" },
    ],
    [section, workspaceSlug]
  );

  useEffect(() => {
    const resolveWorkspace = async () => {
      if (location.state?.workspace) {
        setWorkspace(location.state.workspace);
        setIsResolvingWorkspace(false);
        return;
      }

      if (!authSession?.token) {
        setIsResolvingWorkspace(false);
        return;
      }

      setIsResolvingWorkspace(true);

      try {
        const result = await fetchWorkspaces(authSession.token);
        const workspaces = Array.isArray(result?.workspaces) ? result.workspaces : [];
        const matchedWorkspace = workspaces.find((item) => item.slug === workspaceSlug);

        setWorkspace(matchedWorkspace || null);
      } catch (error) {
        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          setWorkspace(null);
          return;
        }

        await showErrorAlert(
          "Unable to load workspace",
          error.message || "Something went wrong while loading the workspace."
        );
      } finally {
        setIsResolvingWorkspace(false);
      }
    };

    void resolveWorkspace();
  }, [authSession?.token, location.state, workspaceSlug]);

  useEffect(() => {
    if (isResolvingWorkspace || workspace) {
      return;
    }

    navigate(APP_ROUTES.workspace, { replace: true });
  }, [isResolvingWorkspace, navigate, workspace]);

  return (
    <AppLayout
      sidebar={
        <ProjectsSidebar
          sectionLabel={workspaceTitle}
          items={sidebarItems}
          showBackToWorkspace
        />
      }
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      currentYear={currentYear}
    >
      {section === "overview" ? (
        <WorkspaceOverviewMain workspace={workspace} workspaceTitle={workspaceTitle} />
      ) : section === "users" ? (
        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            px: { xs: 1.25, md: 1.75 },
            py: { xs: 1.25, md: 1.75 },
          }}
        >
          <WorkspaceUsersMain workspace={workspace} workspaceTitle={workspaceTitle} />
        </Box>
      ) : (
        <ProjectsMain workspace={workspace} workspaceTitle={workspaceTitle} />
      )}
    </AppLayout>
  );
}
