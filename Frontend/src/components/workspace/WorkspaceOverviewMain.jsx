import { Box, LinearProgress, Sheet, Stack, Typography } from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OverviewSectionCard from "./OverviewSectionCard";
import OverviewMetricGrid from "./OverviewMetricGrid";
import { useAuthContext } from "../../context/AuthContext";
import { fetchProjects } from "../../services/project.service";
import { showAccessDeniedAlert, showErrorAlert } from "../../services/alert.service";
import { APP_ROUTES } from "../../router/authRoutes";
import {
  buildCumulativeSeries,
  buildRecentDateRange,
  getLocalDateOnly,
  normalizeDateOnly,
} from "../../utils/overviewMetrics";

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

export default function WorkspaceOverviewMain({ workspace = null, workspaceTitle = "Workspace" }) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [projects, setProjects] = useState([]);

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

  const summaryCards = useMemo(() => {
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
      <OverviewSectionCard
        title={`${workspaceTitle} Summary`}
        description="A quick snapshot of how projects are moving inside this workspace."
        countLabel={`${summaryCards[0]?.value || 0} projects`}
        chipSx={{ backgroundColor: "#eef2ff", color: "#3155ff" }}
        width="100%"
      >
        {isLoadingSummary ? (
          <Sheet
            variant="soft"
            sx={{
              borderRadius: "16px",
              backgroundColor: "#f8faff",
              px: 1.5,
              py: 1.25,
            }}
          >
            <Stack spacing={1}>
              <Typography level="body-sm" sx={{ color: "#60708e" }}>
                Loading workspace summary...
              </Typography>
              <LinearProgress size="sm" sx={{ borderRadius: "999px" }} />
            </Stack>
          </Sheet>
        ) : (
          <OverviewMetricGrid metrics={summaryCards} />
        )}
      </OverviewSectionCard>
    </Box>
  );
}
