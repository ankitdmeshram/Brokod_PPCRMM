import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsMain from "../components/workspace/ProjectsMain";
import {
  ApplicationsIcon,
  FolderIcon,
  GridIcon,
  NotificationIcon,
  UsersIcon,
} from "../components/workspace/WorkspaceIcons";
import WorkspaceOverviewMain from "../components/workspace/WorkspaceOverviewMain";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildWorkspaceApplicationsRoute,
  buildWorkspaceOverviewRoute,
  buildWorkspaceProjectsRoute,
  buildWorkspaceNotificationsRoute,
  buildWorkspaceUsersRoute,
} from "../router/authRoutes";
import { fetchWorkspaces } from "../services/workspace.service";
import { showAccessDeniedAlert, showErrorAlert } from "../services/alert.service";
import WorkspaceUsersMain from "../components/workspace/WorkspaceUsersMain";
import { Box, Typography } from "@mui/joy";
import WorkspaceNotificationsMain from "../components/workspace/WorkspaceNotificationsMain";
import ApplicationsMain from "../components/workspace/ApplicationsMain";

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
  const firstName = authSession?.user?.firstName || "";
  const lastName = authSession?.user?.lastName || "";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const workspaceTitle = useMemo(
    () => workspace?.workspaceName || formatWorkspaceTitle(workspaceSlug) || "",
    [workspace?.workspaceName, workspaceSlug]
  );
  const canViewWorkspaceUsers =
    ["owner", "admin", "member"].includes(
      String(workspace?.membershipRole || "")
        .trim()
        .toLowerCase()
    );
  const sidebarItems = useMemo(() => {
    const applicationsItem = {
      key: "applications",
      icon: <ApplicationsIcon />,
      label: "Applications",
      to: buildWorkspaceApplicationsRoute(workspaceSlug),
      active: section === "applications",
    };
    const usersItem = canViewWorkspaceUsers
      ? {
          key: "users",
          icon: <UsersIcon />,
          label: "Users",
          to: buildWorkspaceUsersRoute(workspaceSlug),
          active: section === "users",
        }
      : null;
    const notificationsItem = {
      key: "notifications",
      icon: <NotificationIcon />,
      label: "Notifications",
      to: buildWorkspaceNotificationsRoute(workspaceSlug),
      active: section === "notifications",
    };

    if (section === "applications") {
      return [applicationsItem, usersItem, notificationsItem].filter(Boolean);
    }

    return [
      ["users", "notifications"].includes(section) ? applicationsItem : null,
      !["users", "notifications"].includes(section)
        ? {
            key: "overview",
            icon: <GridIcon />,
            label: "Overview",
            to: buildWorkspaceOverviewRoute(workspaceSlug),
            active: section === "overview",
          }
        : null,
      !["users", "notifications"].includes(section)
        ? {
            key: "projects",
            icon: <FolderIcon />,
            label: "Projects",
            to: buildWorkspaceProjectsRoute(workspaceSlug),
            active: section === "projects",
          }
        : null,
      !["overview", "projects"].includes(section) ? usersItem : null,
      !["overview", "projects"].includes(section) ? notificationsItem : null,
    ].filter(Boolean);
  }, [canViewWorkspaceUsers, section, workspaceSlug]);

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
          backToApplicationsRoute={
            ["overview", "projects"].includes(section)
              ? buildWorkspaceApplicationsRoute(workspaceSlug)
              : ""
          }
          showBackToWorkspace
        />
      }
      titleContent={
        <Typography sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}>
          {workspaceTitle}
        </Typography>
      }
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      currentYear={currentYear}
    >
      {section === "applications" ? (
        <ApplicationsMain workspace={workspace} />
      ) : section === "overview" ? (
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
      ) : section === "notifications" ? (
        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            px: { xs: 1.25, md: 1.75 },
            py: { xs: 1.25, md: 1.75 },
          }}
        >
          <WorkspaceNotificationsMain
            workspace={workspace}
            workspaceSlug={workspaceSlug}
            workspaceTitle={workspaceTitle}
          />
        </Box>
      ) : (
        <ProjectsMain workspace={workspace} workspaceTitle={workspaceTitle} />
      )}
    </AppLayout>
  );
}
