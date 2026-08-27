import { Box, Chip, Sheet, Stack, Typography } from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import OverviewMetricGrid from "../components/workspace/OverviewMetricGrid";
import OverviewTaskSection from "../components/workspace/OverviewTaskSection";
import ProjectUsersMain from "../components/workspace/ProjectUsersMain";
import ProjectCalendarMain from "../components/workspace/ProjectCalendarMain";
import ProjectTasksMain from "../components/workspace/ProjectTasksMain";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import WorkspaceNotificationsMain from "../components/workspace/WorkspaceNotificationsMain";
import {
  ActivityLogsIcon,
  CalendarIcon,
  DocumentsIcon,
  GridIcon,
  SettingsIcon,
  TasksIcon,
  UsersIcon,
} from "../components/workspace/WorkspaceIcons";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildTaskDetailsRoute,
  buildProjectSectionRoute,
  buildWorkspaceApplicationsRoute,
  buildWorkspaceProjectsRoute,
} from "../router/authRoutes";
import { showAccessDeniedAlert, showErrorAlert } from "../services/alert.service";
import { fetchProjectBySlug } from "../services/project.service";
import { fetchTasks } from "../services/task.service";
import {
  buildCumulativeRatioSeries,
  buildCumulativeSeries,
  buildRecentDateRange,
  getLocalDateOnly,
  normalizeDateOnly,
} from "../utils/overviewMetrics";
import { fetchWorkspaces } from "../services/workspace.service";

const formatTitle = (value = "") =>
  String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const sectionContent = {
  overview: {
    label: "Overview",
    description: "Project overview is coming soon. This space will surface project health, summary, and key milestones.",
  },
  tasks: {
    label: "Tasks",
    description: "Project tasks are coming soon. This space will hold task planning, status, ownership, and delivery flow.",
  },
  users: {
    label: "Users Management",
    description: "Project users are coming soon. This space will show assigned members and their project roles.",
  },
  notifications: {
    label: "Notifications",
    description: "Project notifications are coming soon. This space will collect alerts, updates, and activity for the team.",
  },
  calendar: {
    label: "Calendar",
    description: "Project calendar is coming soon. This space will surface milestones and due dates on a timeline.",
  },
  documents: {
    label: "Documents",
    description: "Project documents are coming soon. This space will hold files and references shared with the team.",
  },
  activityLogs: {
    label: "Activity Logs",
    description: "Project activity logs are coming soon. This space will show a timeline of task and project changes.",
  },
  settings: {
    label: "Settings",
    description: "Project settings are coming soon. This space will hold project-specific configuration and controls.",
  },
};

const statusChipStyles = {
  Todo: { backgroundColor: "#eef2ff", color: "#3155ff" },
  "In Progress": { backgroundColor: "#e8edff", color: "#3155ff" },
  Review: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  Done: { backgroundColor: "#e9f8ef", color: "#1d8f5a" },
  Blocked: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

export default function WorkspaceProjectTasksPage({ section = "tasks" }) {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceSlug = "", projectSlug = "" } = useParams();
  const routedWorkspace = location.state?.workspace || null;
  const routedProject = location.state?.project || null;
  const [workspace, setWorkspace] = useState(() => routedWorkspace);
  const [project, setProject] = useState(() => routedProject);
  const [isResolving, setIsResolving] = useState(true);
  const [overviewMetrics, setOverviewMetrics] = useState({
    totalTasks: 0,
    notStartedTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    onHoldTasks: 0,
    reviewTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    allTasks: [],
  });
  const [overdueWorkItems, setOverdueWorkItems] = useState([]);
  const [upcomingWorkItems, setUpcomingWorkItems] = useState([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
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

    return formatTitle(projectSlug) || "Project";
  }, [project?.projectName, projectSlug]);
  const handleOverviewTaskClick = (task) => {
    if (!task?.slug) {
      return;
    }

    navigate(buildTaskDetailsRoute(workspaceSlug, projectSlug, task.slug), {
      state: {
        workspace,
        project,
      },
    });
  };
  const kpiCards = useMemo(() => {
    const chartRange = buildRecentDateRange();
    const today = getLocalDateOnly();

    return [
      {
        label: "Total Tasks",
        value: overviewMetrics.totalTasks,
        helper: "All tracked work items",
        color: "#3155ff",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          range: chartRange,
        }),
      },
      {
        label: "Yet to Start",
        value: overviewMetrics.notStartedTasks,
        helper: "Tasks not started yet",
        color: "#64748b",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "todo",
          range: chartRange,
        }),
      },
      {
        label: "In Progress",
        value: overviewMetrics.inProgressTasks,
        helper: "Tasks actively moving",
        color: "#3155ff",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "in_progress",
          range: chartRange,
        }),
      },
      {
        label: "Completed",
        value: overviewMetrics.completedTasks,
        helper: `${overviewMetrics.completionRate}% completion rate`,
        color: "#1d8f5a",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.completedAt || task.updatedAt || task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "done",
          range: chartRange,
        }),
      },
      {
        label: "On Hold",
        value: overviewMetrics.onHoldTasks,
        helper: "Blocked or paused tasks",
        color: "#d97706",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "blocked",
          range: chartRange,
        }),
      },
      {
        label: "In Review",
        value: overviewMetrics.reviewTasks,
        helper: "Waiting for validation",
        color: "#7c3aed",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "review",
          range: chartRange,
        }),
      },
      {
        label: "Overdue",
        value: overviewMetrics.overdueTasks,
        helper: "Past due and not done",
        color: "#d14343",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: overviewMetrics.allTasks,
          dateAccessor: (task) => task.dueDate,
          predicate: (task) => {
            const dueDate = normalizeDateOnly(task.dueDate);
            return Boolean(
              dueDate &&
              dueDate < today &&
              String(task.status || "").toLowerCase() !== "done"
            );
          },
          range: chartRange,
        }),
      },
      {
        label: "Completion Rate",
        value: `${overviewMetrics.completionRate}%`,
        helper: "Overall project progress",
        color: "#0f766e",
        chartLabels: chartRange,
        tooltipValueLabel: "Rate",
        tooltipValueFormatter: (value) => `${value}%`,
        chartData: buildCumulativeRatioSeries({
          numeratorItems: overviewMetrics.allTasks,
          numeratorDateAccessor: (task) => task.completedAt || task.updatedAt || task.createdAt,
          numeratorPredicate: (task) => String(task.status || "").toLowerCase() === "done",
          denominatorItems: overviewMetrics.allTasks,
          denominatorDateAccessor: (task) => task.createdAt,
          range: chartRange,
        }),
      },
    ];
  }, [overviewMetrics]);
  const sidebarItems = useMemo(
    () => [
      {
        key: "overview",
        icon: <GridIcon />,
        label: "Overview",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "overview"),
        active: section === "overview",
      },
      {
        key: "tasks",
        icon: <TasksIcon />,
        label: "Tasks",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "tasks"),
        active: section === "tasks",
      },
      {
        key: "calendar",
        icon: <CalendarIcon />,
        label: "Calendar",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "calendar"),
        active: section === "calendar",
      },
      {
        key: "documents",
        icon: <DocumentsIcon />,
        label: "Documents",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "documents"),
        active: section === "documents",
      },
      {
        key: "users",
        icon: <UsersIcon />,
        label: "Users Management",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "users"),
        active: section === "users",
      },
      {
        key: "activityLogs",
        icon: <ActivityLogsIcon />,
        label: "Activity Logs",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "activity-logs"),
        active: section === "activityLogs",
      },
      {
        key: "settings",
        icon: <SettingsIcon />,
        label: "Settings",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "settings"),
        active: section === "settings",
      },
    ],
    [projectSlug, section, workspaceSlug]
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

        if (routedProject && routedProject.slug === projectSlug) {
          setProject(routedProject);
          return;
        }

        const projectResult = await fetchProjectBySlug(projectSlug, authSession.token, {
          workspaceId: resolvedWorkspace.id,
        });
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
        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          setWorkspace(null);
          setProject(null);
          return;
        }

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
  }, [authSession?.token, projectSlug, routedProject, routedWorkspace, workspace, workspaceSlug]);

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

  useEffect(() => {
    const loadOverviewMetrics = async () => {
      if (
        section !== "overview" ||
        !authSession?.token ||
        !project?.id ||
        !workspace?.id
      ) {
        setOverviewMetrics({
          totalTasks: 0,
          notStartedTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          onHoldTasks: 0,
          reviewTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          allTasks: [],
        });
        setOverdueWorkItems([]);
        setUpcomingWorkItems([]);
        setIsLoadingOverview(false);
        return;
      }

      setIsLoadingOverview(true);

      try {
        const today = getLocalDateOnly();
        const fetchAllTaskPages = async (filters = {}) => {
          const firstPage = await fetchTasks(authSession.token, {
            ...filters,
            projectId: project.id,
            workspaceId: workspace.id,
            page: 1,
            limit: 100,
          });
          const firstTasks = Array.isArray(firstPage?.tasks) ? firstPage.tasks : [];
          const totalPages = Number(firstPage?.pagination?.totalPages || 1);

          if (totalPages <= 1) {
            return firstTasks;
          }

          const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              fetchTasks(authSession.token, {
                ...filters,
                projectId: project.id,
                workspaceId: workspace.id,
                page: index + 2,
                limit: 100,
              })
            )
          );

          return remainingPages.reduce(
            (allTasks, pageResult) => [
              ...allTasks,
              ...(Array.isArray(pageResult?.tasks) ? pageResult.tasks : []),
            ],
            firstTasks
          );
        };

        const [tasks, openDueTasks, upcomingTasks] = await Promise.all([
          fetchAllTaskPages(),
          fetchAllTaskPages({
            advancedFilters: [
              {
                field: "dueDate",
                operator: "<=",
                value: today,
              },
              {
                field: "status",
                operator: "!=",
                value: "done",
              },
            ],
          }),
          fetchAllTaskPages({
            advancedFilters: [
              {
                field: "dueDate",
                operator: ">",
                value: today,
              },
              {
                field: "status",
                operator: "!=",
                value: "done",
              },
            ],
          }),
        ]);
        const completedTasks = tasks.filter(
          (task) => String(task.status || "").toLowerCase() === "done"
        ).length;
        const notStartedTasks = tasks.filter(
          (task) => String(task.status || "").toLowerCase() === "todo"
        ).length;
        const inProgressTasks = tasks.filter(
          (task) => String(task.status || "").toLowerCase() === "in_progress"
        ).length;
        const onHoldTasks = tasks.filter(
          (task) => String(task.status || "").toLowerCase() === "blocked"
        ).length;
        const reviewTasks = tasks.filter(
          (task) => String(task.status || "").toLowerCase() === "review"
        ).length;
        const overdueTasks = tasks.filter((task) => {
          const dueDate = normalizeDateOnly(task.dueDate);

          return Boolean(
            dueDate &&
            dueDate < today &&
            String(task.status || "").toLowerCase() !== "done"
          );
        }).length;
        const sortedOpenDueTasks = openDueTasks
          .sort((leftTask, rightTask) => {
            const leftDueDate = normalizeDateOnly(leftTask?.dueDate) || "";
            const rightDueDate = normalizeDateOnly(rightTask?.dueDate) || "";

            if (leftDueDate !== rightDueDate) {
              return leftDueDate.localeCompare(rightDueDate);
            }

            return String(leftTask.title || "").localeCompare(String(rightTask.title || ""));
          });
        const sortedUpcomingTasks = upcomingTasks
          .sort((leftTask, rightTask) => {
            const leftDueDate = normalizeDateOnly(leftTask?.dueDate) || "";
            const rightDueDate = normalizeDateOnly(rightTask?.dueDate) || "";

            if (leftDueDate !== rightDueDate) {
              return leftDueDate.localeCompare(rightDueDate);
            }

            return String(leftTask.title || "").localeCompare(String(rightTask.title || ""));
          });
        const totalTasks = tasks.length;
        const completionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        setOverviewMetrics({
          totalTasks,
          notStartedTasks,
          completedTasks,
          inProgressTasks,
          onHoldTasks,
          reviewTasks,
          overdueTasks,
          completionRate,
          allTasks: tasks,
        });
        setOverdueWorkItems(sortedOpenDueTasks);
        setUpcomingWorkItems(sortedUpcomingTasks);
      } catch (error) {
        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          navigate(APP_ROUTES.workspace, { replace: true });
          return;
        }

        setOverviewMetrics({
          totalTasks: 0,
          notStartedTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          onHoldTasks: 0,
          reviewTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          allTasks: [],
        });
        setOverdueWorkItems([]);
        setUpcomingWorkItems([]);
        await showErrorAlert(
          "Unable to load overview metrics",
          error.message || "Something went wrong while loading project KPIs."
        );
      } finally {
        setIsLoadingOverview(false);
      }
    };

    void loadOverviewMetrics();
  }, [authSession?.token, navigate, project?.id, section, workspace?.id]);

  return (
    <AppLayout
      initialSidebarCollapsed={section === "tasks"}
      sidebar={
        <ProjectsSidebar
          items={sidebarItems}
          backToApplicationsRoute={buildWorkspaceApplicationsRoute(workspaceSlug)}
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
      {section === "tasks" ? (
        <ProjectTasksMain
          projectTitle={projectTitle}
          project={project}
          workspace={workspace}
        />
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
          <ProjectUsersMain
            project={project}
            projectTitle={projectTitle}
            workspace={workspace}
          />
        </Box>
      ) : section === "overview" ? (
        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            px: { xs: 1.25, md: 1.75 },
            py: { xs: 1.25, md: 1.75 },
          }}
        >
          <OverviewMetricGrid metrics={kpiCards} isLoading={isLoadingOverview} />
          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <OverviewTaskSection
              title="Overdue Work Items"
              description="Tasks due today or earlier that are still not completed."
              countLabel={`${overdueWorkItems.length} open`}
              chipSx={{ backgroundColor: "#fff1f1", color: "#d14343" }}
              items={overdueWorkItems}
              emptyMessage="No incomplete tasks are due today or earlier."
              loadingMessage="Loading work items..."
              isLoading={isLoadingOverview}
              onTaskClick={handleOverviewTaskClick}
              statusChipStyles={statusChipStyles}
            />
            <OverviewTaskSection
              title="Upcoming Tasks"
              description="Next scheduled tasks with due dates after today."
              countLabel={`${upcomingWorkItems.length} upcoming`}
              chipSx={{ backgroundColor: "#eef6ff", color: "#2f6adf" }}
              items={upcomingWorkItems}
              emptyMessage="No upcoming incomplete tasks are scheduled after today."
              loadingMessage="Loading upcoming tasks..."
              isLoading={isLoadingOverview}
              onTaskClick={handleOverviewTaskClick}
              statusChipStyles={statusChipStyles}
            />
          </Box>
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
            workspaceTitle={workspace?.workspaceName || "Workspace"}
            projectName={projectTitle}
          />
        </Box>
      ) : section === "calendar" ? (
        <ProjectCalendarMain
          project={project}
          workspace={workspace}
          projectTitle={projectTitle}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            px: { xs: 1.25, md: 1.75 },
            py: { xs: 1.25, md: 1.75 },
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
              px: 2.5,
              py: 3.5,
            }}
          >
            <Stack spacing={1.75} alignItems="center" sx={{ maxWidth: 560, textAlign: "center" }}>
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
                level="h3"
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
      )}
    </AppLayout>
  );
}
