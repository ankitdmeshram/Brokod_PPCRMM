import { Box, Chip, Sheet, Stack, Typography } from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import {
  GridIcon,
  NotificationIcon,
  SettingsIcon,
  TasksIcon,
} from "../components/workspace/WorkspaceIcons";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildProjectSectionRoute,
  buildWorkspaceProjectsRoute,
} from "../router/authRoutes";
import { showErrorAlert } from "../services/alert.service";
import { fetchProjectById } from "../services/project.service";
import { fetchWorkspaces } from "../services/workspace.service";

const formatTitle = (value = "") =>
  String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getProjectIdFromSlug = (projectSlug = "") => {
  const match = String(projectSlug || "").match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
};

const sectionContent = {
  overview: {
    label: "Overview",
    description: "Project overview is coming soon. This space will surface project health, summary, and key milestones.",
  },
  tasks: {
    label: "Tasks",
    description: "Project tasks are coming soon. This space will hold task planning, status, ownership, and delivery flow.",
  },
  notifications: {
    label: "Notifications",
    description: "Project notifications are coming soon. This space will collect alerts, updates, and activity for the team.",
  },
  settings: {
    label: "Settings",
    description: "Project settings are coming soon. This space will hold project-specific configuration and controls.",
  },
};

export default function WorkspaceProjectTasksPage({ section = "tasks" }) {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceSlug = "", projectName = "" } = useParams();
  const routedWorkspace = location.state?.workspace || null;
  const routedProject = location.state?.project || null;
  const [workspace, setWorkspace] = useState(() => routedWorkspace);
  const [project, setProject] = useState(() => routedProject);
  const [isResolving, setIsResolving] = useState(true);
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const currentSection = sectionContent[section] || sectionContent.tasks;
  const projectTitle = useMemo(() => {
    if (project?.projectName) {
      return project.projectName;
    }

    const normalizedProjectName = String(projectName || "").replace(/-\d+$/, "");
    return formatTitle(normalizedProjectName) || "Project";
  }, [project?.projectName, projectName]);
  const sidebarItems = useMemo(
    () => [
      {
        key: "overview",
        icon: <GridIcon />,
        label: "Overview",
        to: buildProjectSectionRoute(workspaceSlug, projectName, "overview"),
        active: section === "overview",
      },
      {
        key: "tasks",
        icon: <TasksIcon />,
        label: "Tasks",
        to: buildProjectSectionRoute(workspaceSlug, projectName, "tasks"),
        active: section === "tasks",
      },
      {
        key: "notifications",
        icon: <NotificationIcon />,
        label: "Notifications",
        to: buildProjectSectionRoute(workspaceSlug, projectName, "notifications"),
        active: section === "notifications",
      },
      {
        key: "settings",
        icon: <SettingsIcon />,
        label: "Settings",
        to: buildProjectSectionRoute(workspaceSlug, projectName, "settings"),
        active: section === "settings",
      },
    ],
    [projectName, section, workspaceSlug]
  );

  useEffect(() => {
    const resolveContext = async () => {
      if (!authSession?.token) {
        setIsResolving(false);
        return;
      }

      setIsResolving(true);

      try {
        let resolvedWorkspace = routedWorkspace || workspace;

        if (!resolvedWorkspace) {
          const workspaceResult = await fetchWorkspaces(authSession.token);
          const workspaces = Array.isArray(workspaceResult?.workspaces)
            ? workspaceResult.workspaces
            : [];

          resolvedWorkspace = workspaces.find((item) => item.slug === workspaceSlug) || null;
        }

        if (!resolvedWorkspace) {
          setWorkspace(null);
          setProject(null);
          return;
        }

        setWorkspace(resolvedWorkspace);

        if (
          routedProject &&
          Number(routedProject.id) === getProjectIdFromSlug(projectName)
        ) {
          setProject(routedProject);
          return;
        }

        const projectId = getProjectIdFromSlug(projectName);

        if (!projectId) {
          setProject(null);
          return;
        }

        const projectResult = await fetchProjectById(projectId, authSession.token);
        const resolvedProject = projectResult?.project || null;

        if (
          resolvedProject &&
          Number(resolvedProject.workspaceId) === Number(resolvedWorkspace.id)
        ) {
          setProject(resolvedProject);
        } else {
          setProject(null);
        }
      } catch (error) {
        await showErrorAlert(
          "Unable to load project tasks",
          error.message || "Something went wrong while loading the project."
        );
        setWorkspace(null);
        setProject(null);
      } finally {
        setIsResolving(false);
      }
    };

    void resolveContext();
  }, [authSession?.token, projectName, routedProject, routedWorkspace, workspace, workspaceSlug]);

  useEffect(() => {
    if (isResolving) {
      return;
    }

    if (!workspace) {
      navigate(APP_ROUTES.workspace, { replace: true });
      return;
    }

    if (!project) {
      navigate(buildWorkspaceProjectsRoute(workspaceSlug), { replace: true, state: { workspace } });
    }
  }, [isResolving, navigate, project, workspace, workspaceSlug]);

  return (
    <AppLayout
      initialSidebarCollapsed={section === "tasks"}
      sidebar={
        <ProjectsSidebar
          items={sidebarItems}
          backToProjectsRoute={buildWorkspaceProjectsRoute(workspaceSlug)}
          showBackToWorkspace={false}
        />
      }
      titleContent={
        <Typography sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}>
          {project?.projectName || currentSection.label}
        </Typography>
      }
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      currentYear={currentYear}
    >
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          px: { xs: 1.5, md: 2 },
          py: { xs: 1.5, md: 2 },
        }}
      >
        <Sheet
          variant="outlined"
          sx={{
            width: "100%",
            minHeight: { xs: "calc(100vh - 180px)", md: "calc(100vh - 170px)" },
            borderRadius: "10px",
            borderColor: "rgba(220, 226, 244, 0.95)",
            backgroundColor: "#fff",
            boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
            display: "grid",
            placeItems: "center",
            px: 3,
            py: 4,
          }}
        >
          <Stack spacing={2} alignItems="center" sx={{ maxWidth: 560, textAlign: "center" }}>
            <Chip
              variant="soft"
              sx={{
                borderRadius: "999px",
                px: 1.5,
                py: 0.75,
                backgroundColor: "#eef2ff",
                color: "#3155ff",
                fontWeight: 700,
              }}
            >
              {projectTitle}
            </Chip>
            <Typography
              level="h2"
              sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
            >
              {currentSection.label}
            </Typography>
            <Typography level="body-md" sx={{ color: "#5c6d90", lineHeight: 1.7 }}>
              {isResolving
                ? `Loading ${currentSection.label.toLowerCase()}...`
                : currentSection.description}
            </Typography>
            <Chip
              variant="soft"
              sx={{
                borderRadius: "8px",
                px: 1.5,
                py: 0.75,
                backgroundColor: "#eef2ff",
                color: "#3155ff",
                fontWeight: 700,
              }}
            >
              {currentSection.label} Coming Soon
            </Chip>
          </Stack>
        </Sheet>
      </Box>
    </AppLayout>
  );
}
