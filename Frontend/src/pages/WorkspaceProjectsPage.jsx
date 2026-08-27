import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsMain from "../components/workspace/ProjectsMain";
import {
  ActivityLogsIcon,
  ApplicationsIcon,
  AuditLogsIcon,
  CalendarIcon,
  FolderIcon,
  GridIcon,
  NotificationIcon,
  SettingsIcon,
  TasksIcon,
  UsersIcon,
} from "../components/workspace/WorkspaceIcons";
import WorkspaceOverviewMain from "../components/workspace/WorkspaceOverviewMain";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import ComingSoonPanel from "../components/workspace/ComingSoonPanel";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildProjectsAppSectionRoute,
  buildWorkspaceApplicationsRoute,
  buildWorkspaceAuditLogsRoute,
  buildWorkspaceOverviewRoute,
  buildWorkspaceProjectsRoute,
  buildWorkspaceNotificationsRoute,
  buildWorkspaceSettingsRoute,
  buildWorkspaceTasksRoute,
  buildWorkspaceUsersRoute,
} from "../router/authRoutes";
import { fetchWorkspaces } from "../services/workspace.service";
import { showAccessDeniedAlert, showErrorAlert } from "../services/alert.service";
import WorkspaceUsersMain from "../components/workspace/WorkspaceUsersMain";
import { Box, Typography } from "@mui/joy";
import WorkspaceNotificationsMain from "../components/workspace/WorkspaceNotificationsMain";
import ApplicationsMain from "../components/workspace/ApplicationsMain";
import AllTasksMain from "../components/workspace/AllTasksMain";
import AllProjectsCalendarMain from "../components/workspace/AllProjectsCalendarMain";

const formatWorkspaceTitle = (workspaceName = "") =>
  workspaceName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

// Applications, Users & Groups, Notifications, Audit Logs, and Settings sit at
// the workspace level, one step above any individual application.
const level2Sections = [
  "applications",
  "users",
  "notifications",
  "auditLogs",
  "settingsAccess",
  "settingsRoles",
  "settingsWorkspace",
];
const settingsSections = ["settingsAccess", "settingsRoles", "settingsWorkspace"];

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
  const isLevel2Section = level2Sections.includes(section);
  const canViewWorkspaceUsers =
    ["owner", "admin", "member"].includes(
      String(workspace?.membershipRole || "")
        .trim()
        .toLowerCase()
    );

  const sidebarItems = useMemo(() => {
    if (isLevel2Section) {
      return [
        {
          key: "applications",
          icon: <ApplicationsIcon />,
          label: "Applications",
          to: buildWorkspaceApplicationsRoute(workspaceSlug),
          active: section === "applications",
        },
        canViewWorkspaceUsers
          ? {
              key: "users",
              icon: <UsersIcon />,
              label: "Users & Groups",
              to: buildWorkspaceUsersRoute(workspaceSlug),
              active: section === "users",
            }
          : null,
        {
          key: "notifications",
          icon: <NotificationIcon />,
          label: "Notifications",
          to: buildWorkspaceNotificationsRoute(workspaceSlug),
          active: section === "notifications",
        },
        {
          key: "auditLogs",
          icon: <AuditLogsIcon />,
          label: "Audit Logs",
          to: buildWorkspaceAuditLogsRoute(workspaceSlug),
          active: section === "auditLogs",
        },
        {
          key: "settings",
          icon: <SettingsIcon />,
          label: "Settings",
          to: buildWorkspaceSettingsRoute(workspaceSlug, "roles"),
          active: settingsSections.includes(section),
          children: [
            {
              key: "settingsAccess",
              label: "Access Management",
              to: buildWorkspaceSettingsRoute(workspaceSlug, "access"),
              active: section === "settingsAccess",
              disabled: true,
            },
            {
              key: "settingsRoles",
              label: "Roles & Permissions",
              to: buildWorkspaceSettingsRoute(workspaceSlug, "roles"),
              active: section === "settingsRoles",
            },
            {
              key: "settingsWorkspace",
              label: "Workspace Settings",
              to: buildWorkspaceSettingsRoute(workspaceSlug, "workspace"),
              active: section === "settingsWorkspace",
            },
          ],
        },
      ].filter(Boolean);
    }

    return [
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
        key: "tasks",
        icon: <TasksIcon />,
        label: "My Tasks",
        to: buildWorkspaceTasksRoute(workspaceSlug),
        active: section === "tasks",
      },
      {
        key: "calendar",
        icon: <CalendarIcon />,
        label: "Calendar",
        to: buildProjectsAppSectionRoute(workspaceSlug, "calendar"),
        active: section === "calendar",
      },
      {
        key: "projectNotifications",
        icon: <NotificationIcon />,
        label: "Notifications",
        to: buildProjectsAppSectionRoute(workspaceSlug, "notifications"),
        active: section === "projectNotifications",
      },
      canViewWorkspaceUsers
        ? {
            key: "projectUsers",
            icon: <UsersIcon />,
            label: "Users Management",
            to: buildProjectsAppSectionRoute(workspaceSlug, "users"),
            active: section === "projectUsers",
          }
        : null,
      {
        key: "activityLogs",
        icon: <ActivityLogsIcon />,
        label: "Activity Logs",
        to: buildProjectsAppSectionRoute(workspaceSlug, "activity-logs"),
        active: section === "activityLogs",
      },
      {
        key: "appSettings",
        icon: <SettingsIcon />,
        label: "Settings",
        to: buildProjectsAppSectionRoute(workspaceSlug, "settings"),
        active: section === "appSettings",
      },
    ].filter(Boolean);
  }, [canViewWorkspaceUsers, isLevel2Section, section, workspaceSlug]);

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
      initialSidebarCollapsed={section === "tasks"}
      sidebar={
        <ProjectsSidebar
          sectionLabel={workspaceTitle}
          items={sidebarItems}
          backToApplicationsRoute={
            !isLevel2Section ? buildWorkspaceApplicationsRoute(workspaceSlug) : ""
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
      ) : section === "tasks" ? (
        <AllTasksMain workspace={workspace} workspaceTitle={workspaceTitle} />
      ) : section === "users" || section === "projectUsers" ? (
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
      ) : section === "notifications" || section === "projectNotifications" ? (
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
      ) : section === "auditLogs" ? (
        <ComingSoonPanel
          eyebrow="Workspace"
          title="Audit Logs"
          description="A full trail of who changed what across this workspace's applications, users, and settings will live here."
        />
      ) : section === "settingsAccess" ? (
        <ComingSoonPanel
          eyebrow="Settings"
          title="Access Management"
          description="Fine-grained access controls for this workspace are yet to be developed."
        />
      ) : section === "settingsRoles" ? (
        <ComingSoonPanel
          eyebrow="Settings"
          title="Roles & Permissions"
          description="Define custom roles and control what each one can see and do across this workspace."
        />
      ) : section === "settingsWorkspace" ? (
        <ComingSoonPanel
          eyebrow="Settings"
          title="Workspace Settings"
          description="General workspace configuration — name, branding, and defaults — will be managed here."
        />
      ) : section === "calendar" ? (
        <AllProjectsCalendarMain workspace={workspace} workspaceTitle={workspaceTitle} />
      ) : section === "activityLogs" ? (
        <ComingSoonPanel
          eyebrow="Projects"
          title="Activity Logs"
          description="A timeline of task and project activity across this application will appear here."
        />
      ) : section === "appSettings" ? (
        <ComingSoonPanel
          eyebrow="Projects"
          title="Settings"
          description="Configuration for the Projects application — defaults, templates, and preferences — will live here."
        />
      ) : (
        <ProjectsMain workspace={workspace} workspaceTitle={workspaceTitle} />
      )}
    </AppLayout>
  );
}
