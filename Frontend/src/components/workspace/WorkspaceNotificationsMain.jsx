import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import AssignmentTurnedInRounded from "@mui/icons-material/AssignmentTurnedInRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import NotificationsActiveRounded from "@mui/icons-material/NotificationsActiveRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Option,
  Select,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import {
  APP_ROUTES,
  buildProjectSectionRoute,
  buildTaskDetailsRoute,
} from "../../router/authRoutes";
import {
  showAccessDeniedAlert,
  showErrorAlert,
} from "../../services/alert.service";
import { fetchWorkspaceNotifications } from "../../services/workspace.service";

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

const categoryOptions = [
  { value: "all", label: "All notifications" },
  { value: "assignments", label: "Assignments" },
  { value: "projects", label: "Projects" },
  { value: "deadlines", label: "Deadlines" },
];

const NOTIFICATIONS_PAGE_SIZE = 10;

const severityStyles = {
  info: { backgroundColor: "#eef4ff", color: "#3155ff" },
  success: { backgroundColor: "#eaf9ef", color: "#1d8f5a" },
  warning: { backgroundColor: "#fff6e8", color: "#c77700" },
  danger: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatDateOnly = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
};

const resolveNotificationIcon = (category, severity) => {
  if (category === "assignments") {
    return <AssignmentTurnedInRounded />;
  }

  if (category === "projects") {
    return <FolderOpenRounded />;
  }

  if (severity === "warning" || severity === "danger") {
    return <WarningAmberRounded />;
  }

  return <NotificationsActiveRounded />;
};

const buildNotificationMessage = (notification, isProjectScoped = false) => {
  if (!isProjectScoped) {
    return notification.message;
  }

  if (notification.type === "task_assignment") {
    return `"${notification.taskTitle}" is assigned to you.`;
  }

  if (notification.type === "task_comment") {
    return notification.message;
  }

  if (notification.type === "task_overdue") {
    return `"${notification.taskTitle}" missed its due date.`;
  }

  if (notification.type === "task_due_soon") {
    return `"${notification.taskTitle}" is due within 2 days.`;
  }

  if (notification.type === "project_added") {
    const roleMatch = String(notification.message || "").match(/\bas\s+(.+)\.$/i);
    const roleLabel = roleMatch?.[1] ? ` as ${roleMatch[1]}` : "";
    return `You were added to this project${roleLabel}.`;
  }

  if (notification.type === "public_project_created") {
    return "This public project was created.";
  }

  if (notification.type === "project_overdue") {
    return "This project missed its target end date.";
  }

  if (notification.type === "project_due_soon") {
    return "This project is due within 7 days.";
  }

  return notification.message;
};

export default function WorkspaceNotificationsMain({
  workspace = null,
  workspaceSlug = "",
  workspaceTitle = "Workspace",
  projectName = "",
}) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const isProjectScoped = Boolean(projectName);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(NOTIFICATIONS_PAGE_SIZE);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!authSession?.token || !workspace?.id) {
        setNotifications([]);
        setIsLoadingNotifications(false);
        return;
      }

      setIsLoadingNotifications(true);

      try {
        const result = await fetchWorkspaceNotifications(workspace.id, authSession.token, {
          projectName,
        });
        setNotifications(Array.isArray(result?.notifications) ? result.notifications : []);
      } catch (error) {
        setNotifications([]);

        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          navigate(APP_ROUTES.workspace, { replace: true });
          return;
        }

        await showErrorAlert(
          "Unable to load notifications",
          error.message || "Something went wrong while loading workspace notifications."
        );
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    void loadNotifications();
  }, [authSession?.token, navigate, projectName, workspace?.id]);

  const filteredNotifications = useMemo(() => {
    if (categoryFilter === "all") {
      return notifications;
    }

    return notifications.filter(
      (notification) => notification.category === categoryFilter
    );
  }, [categoryFilter, notifications]);

  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, visibleCount),
    [filteredNotifications, visibleCount]
  );

  const hasMoreNotifications = filteredNotifications.length > visibleCount;

  const counts = useMemo(
    () => ({
      all: notifications.length,
      assignments: notifications.filter((item) => item.category === "assignments").length,
      projects: notifications.filter((item) => item.category === "projects").length,
      deadlines: notifications.filter((item) => item.category === "deadlines").length,
    }),
    [notifications]
  );

  useEffect(() => {
    setVisibleCount(NOTIFICATIONS_PAGE_SIZE);
  }, [categoryFilter, notifications]);

  const handleOpenNotification = (notification) => {
    if (notification.taskSlug && notification.projectSlug) {
      navigate(
        buildTaskDetailsRoute(workspaceSlug, notification.projectSlug, notification.taskSlug),
        {
          state: {
            workspace,
          },
        }
      );
      return;
    }

    if (notification.projectSlug) {
      navigate(
        buildProjectSectionRoute(workspaceSlug, notification.projectSlug, "overview"),
        {
          state: {
            workspace,
          },
        }
      );
    }
  };

  return (
    <Sheet
      variant="outlined"
      sx={{
        width: "100%",
        borderRadius: "10px",
        borderColor: "rgba(220, 226, 244, 0.95)",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        boxShadow: "0 16px 34px rgba(157, 171, 208, 0.14)",
      }}
    >
      <Stack spacing={0}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", lg: "center" }}
          sx={{ px: 2.5, py: 2.5 }}
        >
          <Stack spacing={0.5}>
            <Typography
              level="title-lg"
              sx={{ fontWeight: 700, color: "var(--color-font-primary)", fontSize: "1.2rem" }}
            >
              Notifications
            </Typography>
            <Typography level="body-sm" sx={{ color: "#5c6d90", maxWidth: 660 }}>
              {projectName
                ? `Track assignments, project updates, and due-date alerts for ${projectName} inside ${workspaceTitle}.`
                : `Track assignments, new project access, public project launches, and due-date alerts inside ${workspaceTitle}.`}
            </Typography>
          </Stack>

          <Select
            value={categoryFilter}
            onChange={(_, value) => setCategoryFilter(value || "all")}
            sx={{
              minWidth: { xs: "100%", sm: 240 },
              borderRadius: "12px",
              "--Select-focusedHighlight": "rgba(49, 85, 255, 0.18)",
            }}
          >
            {categoryOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Stack>

        <Box
          sx={{
            px: 2.5,
            pb: 2,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {categoryOptions.map((option) => (
            <Chip
              key={option.value}
              variant={categoryFilter === option.value ? "solid" : "soft"}
              onClick={() => setCategoryFilter(option.value)}
              sx={{
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: 600,
                backgroundColor:
                  categoryFilter === option.value ? "#3155ff" : "#eef2ff",
                color: categoryFilter === option.value ? "#fff" : "#3155ff",
              }}
            >
              {option.label} ({counts[option.value]})
            </Chip>
          ))}
        </Box>

        {isLoadingNotifications ? (
          <Sheet sx={{ backgroundColor: "#fff" }}>
            <LinearProgress />
          </Sheet>
        ) : (
          <Stack
            spacing={1.25}
            sx={{
              px: 2.5,
              pb: 2.5,
            }}
          >
            {visibleNotifications.map((notification) => {
              const severitySx =
                severityStyles[String(notification.severity || "info").toLowerCase()] ||
                severityStyles.info;

              return (
                <Sheet
                  key={notification.id}
                  variant="outlined"
                  sx={{
                    borderRadius: "14px",
                    borderColor: "rgba(223, 228, 243, 0.95)",
                    backgroundColor: "#fbfcff",
                    px: 2,
                    py: 1.75,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: "999px",
                          display: "grid",
                          placeItems: "center",
                          ...severitySx,
                        }}
                      >
                        {resolveNotificationIcon(notification.category, notification.severity)}
                      </Box>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                            {notification.title}
                          </Typography>
                          <Chip
                            size="sm"
                            variant="soft"
                            sx={{
                              borderRadius: "999px",
                              fontWeight: 600,
                              ...severitySx,
                            }}
                          >
                            {notification.category}
                          </Chip>
                        </Stack>
                        <Typography level="body-sm" sx={{ color: "#5c6d90", lineHeight: 1.6 }}>
                          {buildNotificationMessage(notification, isProjectScoped)}
                        </Typography>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                          <Typography level="body-xs" sx={{ color: "#7b8596" }}>
                            Notified: {formatDateTime(notification.createdAt)}
                          </Typography>
                          {notification.dueDate ? (
                            <Typography level="body-xs" sx={{ color: "#7b8596" }}>
                              Due: {formatDateOnly(notification.dueDate)}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Stack>

                    {notification.projectSlug ? (
                      <Button
                        variant="plain"
                        endDecorator={<OpenInNewRounded />}
                        onClick={() => handleOpenNotification(notification)}
                        sx={{
                          alignSelf: { xs: "flex-start", md: "center" },
                          whiteSpace: "nowrap",
                          color: "#3155ff",
                        }}
                      >
                        Open
                      </Button>
                    ) : null}
                  </Stack>
                </Sheet>
              );
            })}

            {visibleNotifications.length === 0 ? (
              <Stack alignItems="center" spacing={0.75} sx={{ py: 6 }}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                  No notifications found
                </Typography>
                <Typography level="body-sm" sx={{ color: "#7b8596", textAlign: "center" }}>
                  {categoryFilter === "all"
                    ? "You are all caught up for this workspace right now."
                    : "No notifications match this filter right now."}
                </Typography>
              </Stack>
            ) : null}

            {hasMoreNotifications ? (
              <Stack alignItems="center" sx={{ pt: 1 }}>
                <Button
                  variant="soft"
                  onClick={() =>
                    setVisibleCount((currentCount) => currentCount + NOTIFICATIONS_PAGE_SIZE)
                  }
                  sx={{
                    borderRadius: "12px",
                    px: 2,
                    fontWeight: 600,
                    backgroundColor: "#eef2ff",
                    color: "#3155ff",
                  }}
                >
                  Show more
                </Button>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Stack>
    </Sheet>
  );
}
