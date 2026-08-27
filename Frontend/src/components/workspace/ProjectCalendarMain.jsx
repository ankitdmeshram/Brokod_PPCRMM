import {
  Box,
  Button,
  Chip,
  DialogContent,
  DialogTitle,
  IconButton,
  Modal,
  ModalClose,
  ModalDialog,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { buildTaskDetailsRoute } from "../../router/authRoutes";
import { showErrorAlert } from "../../services/alert.service";
import { fetchAllTasks } from "../../services/task.service";
import { getLocalDateOnly, normalizeDateOnly } from "../../utils/overviewMetrics";
import { NextIcon, PrevIcon } from "./WorkspaceIcons";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const maxVisibleTasksPerDay = 3;

const statusStyles = {
  Todo: { backgroundColor: "#eef2ff", color: "#3155ff" },
  "In Progress": { backgroundColor: "#e8edff", color: "#3155ff" },
  Review: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  Done: { backgroundColor: "#e9f8ef", color: "#1d8f5a" },
  Blocked: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const toTitleCase = (value = "") =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatMonthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const formatDayModalTitle = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

// Builds the full 6-row grid the calendar renders, padded with the trailing
// days of the previous month and the leading days of the next so every week
// row stays a full 7 columns.
const buildMonthGrid = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    return cellDate;
  });
};

export default function ProjectCalendarMain({
  project = null,
  workspace = null,
  projectTitle = "Project",
}) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const today = getLocalDateOnly();
  const [visibleYear, setVisibleYear] = useState(() => new Date().getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date().getMonth());
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openDayKey, setOpenDayKey] = useState(null);

  const gridDates = useMemo(() => buildMonthGrid(visibleYear, visibleMonth), [visibleYear, visibleMonth]);
  const gridStartKey = getLocalDateOnly(gridDates[0]);
  const gridEndKey = getLocalDateOnly(gridDates[gridDates.length - 1]);

  useEffect(() => {
    const loadCalendarTasks = async () => {
      if (!authSession?.token || !project?.id) {
        setTasks([]);
        return;
      }

      setIsLoading(true);

      try {
        const result = await fetchAllTasks(authSession.token, {
          projectId: project.id,
          workspaceId: workspace?.id,
          advancedFilters: [
            { field: "dueDate", operator: "gte", value: gridStartKey },
            { field: "dueDate", operator: "lte", value: gridEndKey },
          ],
        });

        setTasks(Array.isArray(result) ? result : []);
      } catch (error) {
        setTasks([]);
        await showErrorAlert(
          "Unable to load calendar",
          error.message || "Something went wrong while loading the project calendar."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCalendarTasks();
  }, [authSession?.token, gridEndKey, gridStartKey, project?.id, workspace?.id]);

  const tasksByDay = useMemo(() => {
    const map = new Map();

    tasks.forEach((task) => {
      const dueDateKey = normalizeDateOnly(task.dueDate);

      if (!dueDateKey) {
        return;
      }

      if (!map.has(dueDateKey)) {
        map.set(dueDateKey, []);
      }

      map.get(dueDateKey).push(task);
    });

    return map;
  }, [tasks]);

  const handleGoToPreviousMonth = () => {
    const previousMonthDate = new Date(visibleYear, visibleMonth - 1, 1);
    setVisibleYear(previousMonthDate.getFullYear());
    setVisibleMonth(previousMonthDate.getMonth());
  };

  const handleGoToNextMonth = () => {
    const nextMonthDate = new Date(visibleYear, visibleMonth + 1, 1);
    setVisibleYear(nextMonthDate.getFullYear());
    setVisibleMonth(nextMonthDate.getMonth());
  };

  const handleGoToToday = () => {
    setVisibleYear(new Date().getFullYear());
    setVisibleMonth(new Date().getMonth());
  };

  const handleOpenTask = (task) => {
    if (!workspace?.slug || !project?.slug || !task?.slug) {
      return;
    }

    navigate(buildTaskDetailsRoute(workspace.slug, project.slug, task.slug), {
      state: { workspace, project, task },
    });
  };

  const openDayTasks = openDayKey ? tasksByDay.get(openDayKey) || [] : [];

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
      <Sheet
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: "10px",
          borderColor: "rgba(220, 226, 244, 0.95)",
          backgroundColor: "#fff",
          overflow: "hidden",
          boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ px: 1.75, py: 1.9 }}
        >
          <Stack spacing={0.5}>
            <Typography level="title-lg" sx={{ fontWeight: 700, color: "var(--color-font-primary)", fontSize: "1.08rem" }}>
              Calendar
            </Typography>
            <Typography level="body-sm" sx={{ color: "#5c6d90", fontSize: "0.82rem" }}>
              Tasks due this month for {projectTitle}.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="sm"
              variant="outlined"
              color="neutral"
              onClick={handleGoToToday}
              sx={{ minHeight: "34px", borderRadius: "10px" }}
            >
              Today
            </Button>
            <Stack
              direction="row"
              alignItems="center"
              sx={{ border: "1px solid #dfe4f1", borderRadius: "10px", overflow: "hidden" }}
            >
              <IconButton
                size="sm"
                variant="plain"
                aria-label="Previous month"
                onClick={handleGoToPreviousMonth}
              >
                <PrevIcon />
              </IconButton>
              <Typography
                level="body-sm"
                sx={{ px: 1, minWidth: 132, textAlign: "center", fontWeight: 700, color: "#1f2a44" }}
              >
                {formatMonthLabel(visibleYear, visibleMonth)}
              </Typography>
              <IconButton
                size="sm"
                variant="plain"
                aria-label="Next month"
                onClick={handleGoToNextMonth}
              >
                <NextIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            borderTop: "1px solid rgba(223, 228, 243, 0.9)",
          }}
        >
          {weekdayLabels.map((label) => (
            <Box
              key={label}
              sx={{
                py: 1,
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#8b96b3",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(223, 228, 243, 0.9)",
              }}
            >
              {label}
            </Box>
          ))}

          {gridDates.map((cellDate) => {
            const dateKey = getLocalDateOnly(cellDate);
            const isCurrentMonth = cellDate.getMonth() === visibleMonth;
            const isToday = dateKey === today;
            const dayTasks = tasksByDay.get(dateKey) || [];
            const overflowCount = dayTasks.length - maxVisibleTasksPerDay;

            return (
              <Box
                key={dateKey}
                sx={{
                  minHeight: 118,
                  p: 0.75,
                  borderRight: "1px solid rgba(223, 228, 243, 0.9)",
                  borderBottom: "1px solid rgba(223, 228, 243, 0.9)",
                  backgroundColor: isCurrentMonth ? "#fff" : "#fafbfd",
                  "&:nth-of-type(7n)": { borderRight: "none" },
                }}
              >
                <Stack direction="row" justifyContent="flex-end">
                  <Typography
                    level="body-sm"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 22,
                      minHeight: 22,
                      borderRadius: "50%",
                      fontWeight: isToday ? 700 : 500,
                      backgroundColor: isToday ? "#3155ff" : "transparent",
                      color: isToday ? "#fff" : isCurrentMonth ? "#4b5563" : "#b3bcd2",
                    }}
                  >
                    {cellDate.getDate()}
                  </Typography>
                </Stack>

                <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                  {dayTasks.slice(0, maxVisibleTasksPerDay).map((task) => (
                    <Tooltip key={task.id} title={task.title} placement="top" variant="soft">
                      <Chip
                        size="sm"
                        variant="soft"
                        onClick={() => handleOpenTask(task)}
                        sx={{
                          justifyContent: "flex-start",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                          maxWidth: "100%",
                          cursor: "pointer",
                          ...(statusStyles[toTitleCase(task.status)] || statusStyles.Todo),
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          },
                        }}
                      >
                        {task.title}
                      </Chip>
                    </Tooltip>
                  ))}
                  {overflowCount > 0 ? (
                    <Chip
                      size="sm"
                      variant="plain"
                      onClick={() => setOpenDayKey(dateKey)}
                      sx={{
                        alignSelf: "flex-start",
                        borderRadius: "6px",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        color: "#3155ff",
                        cursor: "pointer",
                        px: 0.5,
                      }}
                    >
                      +{overflowCount} more
                    </Chip>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Box>

        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 2.5 }}>
            <Typography level="body-sm" sx={{ color: "#7b8596" }}>
              Loading calendar...
            </Typography>
          </Stack>
        ) : null}
      </Sheet>

      <Modal open={Boolean(openDayKey)} onClose={() => setOpenDayKey(null)}>
        <ModalDialog layout="center" sx={{ width: "100%", maxWidth: 420, borderRadius: "16px" }}>
          <ModalClose onClick={() => setOpenDayKey(null)} />
          <DialogTitle sx={{ fontWeight: 700 }}>
            {openDayKey ? formatDayModalTitle(openDayKey) : ""}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1}>
              {openDayTasks.map((task) => (
                <Sheet
                  key={task.id}
                  variant="outlined"
                  onClick={() => {
                    setOpenDayKey(null);
                    handleOpenTask(task);
                  }}
                  sx={{
                    p: 1.1,
                    borderRadius: "10px",
                    borderColor: "#e4e9f5",
                    cursor: "pointer",
                    "&:hover": { backgroundColor: "#f7f9ff" },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography level="body-sm" sx={{ fontWeight: 700, color: "#2f3b55" }}>
                      {task.title}
                    </Typography>
                    <Chip
                      size="sm"
                      variant="soft"
                      sx={{
                        borderRadius: "999px",
                        fontWeight: 700,
                        ...(statusStyles[toTitleCase(task.status)] || statusStyles.Todo),
                      }}
                    >
                      {toTitleCase(task.status)}
                    </Chip>
                  </Stack>
                </Sheet>
              ))}
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
