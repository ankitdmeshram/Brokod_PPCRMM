import { Box, Chip, LinearProgress, Sheet, Stack, Typography } from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OverviewSectionCard from "./OverviewSectionCard";
import OverviewTaskSection from "./OverviewTaskSection";
import OverviewMetricGrid from "./OverviewMetricGrid";
import { useAuthContext } from "../../context/AuthContext";
import { fetchProjects } from "../../services/project.service";
import { fetchAllTasks } from "../../services/task.service";
import { showAccessDeniedAlert, showErrorAlert } from "../../services/alert.service";
import { APP_ROUTES, buildProjectTasksRoute, buildTaskDetailsRoute } from "../../router/authRoutes";
import {
  buildCumulativeRatioSeries,
  buildCumulativeSeries,
  buildRecentDateRange,
  getLocalDateOnly,
  normalizeDateOnly,
} from "../../utils/overviewMetrics";

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

const statusChipStyles = {
  Todo: { backgroundColor: "#eef2ff", color: "#3155ff" },
  "In Progress": { backgroundColor: "#e8edff", color: "#3155ff" },
  Review: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  Done: { backgroundColor: "#e9f8ef", color: "#1d8f5a" },
  Blocked: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const projectStatusChipStyles = {
  completed: { backgroundColor: "#e9f8ef", color: "#1d8f5a" },
  cancelled: { backgroundColor: "#fff1f1", color: "#d14343" },
  "on hold": { backgroundColor: "#fff4e8", color: "#d97706" },
  default: { backgroundColor: "#eef2ff", color: "#3155ff" },
};

const toTitleCase = (value = "") =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateLabel = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function WorkspaceOverviewMain({ workspace = null, workspaceTitle = "Workspace" }) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [projects, setProjects] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskMetrics, setTaskMetrics] = useState({
    totalTasks: 0,
    notStartedTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    allTasks: [],
  });
  const [overdueWorkItems, setOverdueWorkItems] = useState([]);
  const [upcomingWorkItems, setUpcomingWorkItems] = useState([]);

  useEffect(() => {
    const loadWorkspaceProjects = async () => {
      if (!authSession?.token || !workspace?.id) {
        setProjects([]);
        setIsLoadingSummary(false);
        return;
      }

      setIsLoadingSummary(true);

      try {
        const firstPage = await fetchProjects(authSession.token, {
          workspaceId: workspace.id,
          page: 1,
          limit: 100,
        });

        const firstProjects = Array.isArray(firstPage?.projects) ? firstPage.projects : [];
        const totalPages = Number(firstPage?.pagination?.totalPages || 1);

        if (totalPages <= 1) {
          setProjects(firstProjects);
          return;
        }

        const remainingPageResults = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            fetchProjects(authSession.token, {
              workspaceId: workspace.id,
              page: index + 2,
              limit: 100,
            })
          )
        );

        const allProjects = remainingPageResults.reduce(
          (collectedProjects, pageResult) => [
            ...collectedProjects,
            ...(Array.isArray(pageResult?.projects) ? pageResult.projects : []),
          ],
          firstProjects
        );

        setProjects(allProjects);
      } catch (error) {
        setProjects([]);

        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          navigate(APP_ROUTES.workspace, { replace: true });
          return;
        }

        await showErrorAlert(
          "Unable to load workspace summary",
          error.message || "Something went wrong while loading workspace overview."
        );
      } finally {
        setIsLoadingSummary(false);
      }
    };

    void loadWorkspaceProjects();
  }, [authSession?.token, navigate, workspace?.id]);

  useEffect(() => {
    const loadWorkspaceTasks = async () => {
      if (!authSession?.token || !workspace?.id) {
        setTaskMetrics({
          totalTasks: 0,
          notStartedTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          allTasks: [],
        });
        setOverdueWorkItems([]);
        setUpcomingWorkItems([]);
        setIsLoadingTasks(false);
        return;
      }

      setIsLoadingTasks(true);

      try {
        const today = getLocalDateOnly();
        const [tasks, openDueTasks, upcomingTasks] = await Promise.all([
          fetchAllTasks(authSession.token, { workspaceId: workspace.id }),
          fetchAllTasks(authSession.token, {
            workspaceId: workspace.id,
            advancedFilters: [
              { field: "dueDate", operator: "<=", value: today },
              { field: "status", operator: "!=", value: "done" },
            ],
          }),
          fetchAllTasks(authSession.token, {
            workspaceId: workspace.id,
            advancedFilters: [
              { field: "dueDate", operator: ">", value: today },
              { field: "status", operator: "!=", value: "done" },
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
        const overdueTasks = tasks.filter((task) => {
          const dueDate = normalizeDateOnly(task.dueDate);

          return Boolean(
            dueDate && dueDate < today && String(task.status || "").toLowerCase() !== "done"
          );
        }).length;
        const totalTasks = tasks.length;
        const completionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const sortByDueDateThenTitle = (leftTask, rightTask) => {
          const leftDueDate = normalizeDateOnly(leftTask?.dueDate) || "";
          const rightDueDate = normalizeDateOnly(rightTask?.dueDate) || "";

          if (leftDueDate !== rightDueDate) {
            return leftDueDate.localeCompare(rightDueDate);
          }

          return String(leftTask.title || "").localeCompare(String(rightTask.title || ""));
        };

        setTaskMetrics({
          totalTasks,
          notStartedTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          completionRate,
          allTasks: tasks,
        });
        setOverdueWorkItems([...openDueTasks].sort(sortByDueDateThenTitle));
        setUpcomingWorkItems([...upcomingTasks].sort(sortByDueDateThenTitle));
      } catch (error) {
        setTaskMetrics({
          totalTasks: 0,
          notStartedTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          allTasks: [],
        });
        setOverdueWorkItems([]);
        setUpcomingWorkItems([]);

        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          navigate(APP_ROUTES.workspace, { replace: true });
          return;
        }

        await showErrorAlert(
          "Unable to load task summary",
          error.message || "Something went wrong while loading workspace tasks."
        );
      } finally {
        setIsLoadingTasks(false);
      }
    };

    void loadWorkspaceTasks();
  }, [authSession?.token, navigate, workspace?.id]);

  const projectSummaryCards = useMemo(() => {
    const today = getLocalDateOnly();
    const chartRange = buildRecentDateRange();
    const totalProjects = projects.length;
    const completedProjects = projects.filter(
      (project) => String(project.status || "").toLowerCase() === "completed"
    ).length;
    const activeProjects = projects.filter((project) => {
      const status = String(project.status || "").toLowerCase();

      return status !== "completed" && status !== "cancelled";
    }).length;
    const delayedProjects = projects.filter((project) => {
      const status = String(project.status || "").toLowerCase();
      const endDate = normalizeDateOnly(project.endDate);

      return (
        endDate &&
        endDate < today &&
        status !== "completed" &&
        status !== "cancelled"
      );
    }).length;

    return [
      {
        label: "Total Projects",
        value: totalProjects,
        helper: "All projects in this workspace",
        color: "#3155ff",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: projects,
          dateAccessor: (project) => project.createdAt,
          range: chartRange,
        }),
      },
      {
        label: "Active Projects",
        value: activeProjects,
        helper: "Projects not completed or cancelled",
        color: "#2f6adf",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: projects,
          dateAccessor: (project) => project.createdAt,
          predicate: (project) => {
            const status = String(project.status || "").toLowerCase();
            return status !== "completed" && status !== "cancelled";
          },
          range: chartRange,
        }),
      },
      {
        label: "Completed Projects",
        value: completedProjects,
        helper: "Projects marked as completed",
        color: "#1d8f5a",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: projects,
          dateAccessor: (project) => project.updatedAt || project.endDate || project.createdAt,
          predicate: (project) => String(project.status || "").toLowerCase() === "completed",
          range: chartRange,
        }),
      },
      {
        label: "Delayed Projects",
        value: delayedProjects,
        helper: "Open projects past their end date",
        color: "#d14343",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: projects,
          dateAccessor: (project) => project.endDate,
          predicate: (project) => {
            const status = String(project.status || "").toLowerCase();
            const endDate = normalizeDateOnly(project.endDate);

            return Boolean(
              endDate &&
              endDate < today &&
              status !== "completed" &&
              status !== "cancelled"
            );
          },
          range: chartRange,
        }),
      },
    ];
  }, [projects]);

  const taskSummaryCards = useMemo(() => {
    const chartRange = buildRecentDateRange();
    const today = getLocalDateOnly();

    return [
      {
        label: "Total Tasks",
        value: taskMetrics.totalTasks,
        helper: "All tracked work items",
        color: "#3155ff",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: taskMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          range: chartRange,
        }),
      },
      {
        label: "Yet to Start",
        value: taskMetrics.notStartedTasks,
        helper: "Tasks not started yet",
        color: "#64748b",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: taskMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "todo",
          range: chartRange,
        }),
      },
      {
        label: "In Progress",
        value: taskMetrics.inProgressTasks,
        helper: "Tasks actively moving",
        color: "#3155ff",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: taskMetrics.allTasks,
          dateAccessor: (task) => task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "in_progress",
          range: chartRange,
        }),
      },
      {
        label: "Completed",
        value: taskMetrics.completedTasks,
        helper: `${taskMetrics.completionRate}% completion rate`,
        color: "#1d8f5a",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: taskMetrics.allTasks,
          dateAccessor: (task) => task.completedAt || task.updatedAt || task.createdAt,
          predicate: (task) => String(task.status || "").toLowerCase() === "done",
          range: chartRange,
        }),
      },
      {
        label: "Overdue",
        value: taskMetrics.overdueTasks,
        helper: "Past due and not done",
        color: "#d14343",
        chartLabels: chartRange,
        chartData: buildCumulativeSeries({
          items: taskMetrics.allTasks,
          dateAccessor: (task) => task.dueDate,
          predicate: (task) => {
            const dueDate = normalizeDateOnly(task.dueDate);
            return Boolean(
              dueDate && dueDate < today && String(task.status || "").toLowerCase() !== "done"
            );
          },
          range: chartRange,
        }),
      },
      {
        label: "Completion Rate",
        value: `${taskMetrics.completionRate}%`,
        helper: "Overall task progress",
        color: "#0f766e",
        chartLabels: chartRange,
        tooltipValueLabel: "Rate",
        tooltipValueFormatter: (value) => `${value}%`,
        chartData: buildCumulativeRatioSeries({
          numeratorItems: taskMetrics.allTasks,
          numeratorDateAccessor: (task) => task.completedAt || task.updatedAt || task.createdAt,
          numeratorPredicate: (task) => String(task.status || "").toLowerCase() === "done",
          denominatorItems: taskMetrics.allTasks,
          denominatorDateAccessor: (task) => task.createdAt,
          range: chartRange,
        }),
      },
    ];
  }, [taskMetrics]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((leftProject, rightProject) => {
          const leftDate = leftProject.updatedAt || leftProject.createdAt || "";
          const rightDate = rightProject.updatedAt || rightProject.createdAt || "";
          return String(rightDate).localeCompare(String(leftDate));
        })
        .slice(0, 5),
    [projects]
  );

  const handleTaskClick = (task) => {
    if (!workspace?.slug || !task?.projectSlug || !task?.slug) {
      return;
    }

    navigate(buildTaskDetailsRoute(workspace.slug, task.projectSlug, task.slug), {
      state: { workspace, task },
    });
  };

  const handleProjectClick = (project) => {
    if (!workspace?.slug || !project?.slug) {
      return;
    }

    navigate(buildProjectTasksRoute(workspace.slug, project.slug), {
      state: { workspace, project },
    });
  };

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        px: { xs: 1.25, md: 1.75 },
        py: { xs: 1.25, md: 1.75 },
      }}
    >
      <Stack spacing={2}>
        <OverviewSectionCard
          title={`${workspaceTitle} Summary`}
          description="A quick snapshot of how projects are moving inside this workspace."
          countLabel={`${projectSummaryCards[0]?.value || 0} projects`}
          chipSx={{ backgroundColor: "#eef2ff", color: "#3155ff" }}
          width="100%"
        >
          {isLoadingSummary ? (
            <Sheet
              variant="soft"
              sx={{ borderRadius: "16px", backgroundColor: "#f8faff", px: 1.5, py: 1.25 }}
            >
              <Stack spacing={1}>
                <Typography level="body-sm" sx={{ color: "#60708e" }}>
                  Loading workspace summary...
                </Typography>
                <LinearProgress size="sm" sx={{ borderRadius: "999px" }} />
              </Stack>
            </Sheet>
          ) : (
            <OverviewMetricGrid metrics={projectSummaryCards} />
          )}
        </OverviewSectionCard>

        <OverviewSectionCard
          title="Task Summary"
          description="Where every task across this workspace's projects currently stands."
          countLabel={`${taskMetrics.totalTasks} tasks`}
          chipSx={{ backgroundColor: "#eef2ff", color: "#3155ff" }}
          width="100%"
        >
          {isLoadingTasks ? (
            <Sheet
              variant="soft"
              sx={{ borderRadius: "16px", backgroundColor: "#f8faff", px: 1.5, py: 1.25 }}
            >
              <Stack spacing={1}>
                <Typography level="body-sm" sx={{ color: "#60708e" }}>
                  Loading task summary...
                </Typography>
                <LinearProgress size="sm" sx={{ borderRadius: "999px" }} />
              </Stack>
            </Sheet>
          ) : (
            <OverviewMetricGrid
              metrics={taskSummaryCards}
              columns={{ xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" }}
            />
          )}
        </OverviewSectionCard>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <OverviewTaskSection
            title="Overdue Work Items"
            description="Tasks due today or earlier that are still not completed."
            countLabel={`${overdueWorkItems.length} open`}
            chipSx={{ backgroundColor: "#fff1f1", color: "#d14343" }}
            items={overdueWorkItems}
            emptyMessage="No incomplete tasks are due today or earlier."
            loadingMessage="Loading work items..."
            isLoading={isLoadingTasks}
            onTaskClick={handleTaskClick}
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
            isLoading={isLoadingTasks}
            onTaskClick={handleTaskClick}
            statusChipStyles={statusChipStyles}
          />
        </Box>

        <OverviewSectionCard
          title="Recently Updated Projects"
          description="Jump back into the projects that changed most recently."
          countLabel={`${recentProjects.length} shown`}
          chipSx={{ backgroundColor: "#eef2ff", color: "#3155ff" }}
          width="100%"
        >
          {isLoadingSummary ? (
            <Typography level="body-sm" sx={{ color: "#60708e" }}>
              Loading projects...
            </Typography>
          ) : recentProjects.length ? (
            <Stack spacing={1}>
              {recentProjects.map((project) => {
                const statusKey = String(project.status || "").toLowerCase();
                const statusStyle = projectStatusChipStyles[statusKey] || projectStatusChipStyles.default;

                return (
                  <Sheet
                    key={project.id}
                    variant="soft"
                    onClick={() => handleProjectClick(project)}
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      backgroundColor: "#f8faff",
                      border: "1px solid rgba(220, 226, 244, 0.85)",
                      cursor: "pointer",
                      transition: "transform 160ms ease, box-shadow 160ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: "0 14px 28px rgba(170, 180, 214, 0.12)",
                      },
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography level="title-md" sx={{ fontWeight: 600, color: "var(--color-font-primary)" }}>
                          {project.projectName || "Untitled project"}
                        </Typography>
                        <Typography level="body-sm" sx={{ color: "#60708e" }}>
                          Updated {formatDateLabel(project.updatedAt || project.createdAt)}
                        </Typography>
                      </Stack>
                      <Chip
                        size="sm"
                        sx={{ borderRadius: "999px", fontWeight: 600, ...statusStyle }}
                      >
                        {toTitleCase(project.status) || "Active"}
                      </Chip>
                    </Stack>
                  </Sheet>
                );
              })}
            </Stack>
          ) : (
            <Typography level="body-sm" sx={{ color: "#60708e" }}>
              No projects yet. Create a project to see it here.
            </Typography>
          )}
        </OverviewSectionCard>
      </Stack>
    </Box>
  );
}
