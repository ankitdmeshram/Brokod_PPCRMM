import { Box, Button, Chip, IconButton, Input, Option, Select, Sheet, Stack, Table, Tooltip, Typography } from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../services/alert.service";
import { fetchProjectUsers } from "../../services/project.service";
import { createTask, deleteTask, fetchTasks } from "../../services/task.service";
import {
  buildTaskDetailsRoute,
} from "../../router/authRoutes";
import CreateTaskModal from "./CreateTaskModal";
import {
  DeleteIcon,
  EditIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
} from "./WorkspaceIcons";

const statusStyles = {
  Todo: { backgroundColor: "#eef2ff", color: "#3155ff" },
  "In Progress": { backgroundColor: "#e8edff", color: "#3155ff" },
  Review: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  Done: { backgroundColor: "#e9f8ef", color: "#1d8f5a" },
  Blocked: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const priorityStyles = {
  Low: { backgroundColor: "#f3f4f6", color: "#5b6473" },
  Medium: { backgroundColor: "#eef2ff", color: "#3155ff" },
  High: { backgroundColor: "#fff4e8", color: "#d97706" },
  Critical: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const typeStyles = {
  Feature: { backgroundColor: "#eef2ff", color: "#3155ff" },
  Bug: { backgroundColor: "#fff1f1", color: "#d14343" },
  Improvement: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  Research: { backgroundColor: "#f8f4ff", color: "#7c3aed" },
};

const initialPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const formatDateLabel = (value, withTime = false) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {}),
  });
};

const buildInitialTaskFormValues = ({ projectId, workspaceId, currentUserId }) => ({
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  taskType: "feature",
  assignedBy: currentUserId ? String(currentUserId) : "",
  assignedTo: "",
  createdBy: currentUserId ? String(currentUserId) : "",
  startDate: "",
  dueDate: "",
  completedDate: "",
  projectId: projectId ? String(projectId) : "",
  workspaceId: workspaceId ? String(workspaceId) : "",
  tags: [],
  comments: "",
  activityLogs: "",
});

const areTaskFormValuesDirty = (values, initialValues) =>
  values.title !== initialValues.title ||
  values.description !== initialValues.description ||
  values.status !== initialValues.status ||
  values.priority !== initialValues.priority ||
  values.taskType !== initialValues.taskType ||
  values.assignedBy !== initialValues.assignedBy ||
  values.assignedTo !== initialValues.assignedTo ||
  values.createdBy !== initialValues.createdBy ||
  values.startDate !== initialValues.startDate ||
  values.dueDate !== initialValues.dueDate ||
  values.completedDate !== initialValues.completedDate ||
  values.projectId !== initialValues.projectId ||
  values.workspaceId !== initialValues.workspaceId ||
  values.comments !== initialValues.comments ||
  values.activityLogs !== initialValues.activityLogs ||
  JSON.stringify(values.tags) !== JSON.stringify(initialValues.tags);

const toTitleCase = (value = "") =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatTaskCode = (taskId) => `TSK-${taskId}`;

const buildUserLabel = (user = {}) =>
  `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim() ||
  user.email ||
  `User ${user.id}`;

const mapApiTaskToTableRow = (task) => ({
  rawId: Number(task.id),
  rawTask: task,
  slug: task.slug || "",
  id: formatTaskCode(task.id),
  title: task.title,
  description: task.description || "",
  status: toTitleCase(task.status),
  priority: toTitleCase(task.priority),
  assignedBy: task.assignedByName || "-",
  assignedTo: task.assignedToName || "-",
  createdBy: task.createdByName || "-",
  startDate: task.startDate || "",
  dueDate: task.dueDate || "",
  completedDate: task.completedAt || "",
  taskType: toTitleCase(task.taskType),
  tags: Array.isArray(task.tags) ? task.tags : [],
  comments: Number(task.commentsCount || 0),
  activityLogs: Number(task.activityLogsCount || 0),
  projectId: String(task.projectId || "-"),
  workspaceId: String(task.workspaceId || "-"),
  createdAt: task.createdAt || "",
  updatedAt: task.updatedAt || "",
});

export default function ProjectTasksMain({
  projectTitle = "Project",
  project = null,
  workspace = null,
}) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(initialPagination);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [reloadTasksKey, setReloadTasksKey] = useState(0);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [deletingTaskIds, setDeletingTaskIds] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);

  const currentUser = authSession?.user || null;
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;
  const currentUserLabel =
    `${String(currentUser?.firstName || "").trim()} ${String(currentUser?.lastName || "").trim()}`.trim() ||
    currentUser?.email ||
    "Current User";

  const initialTaskFormValues = useMemo(
    () =>
      buildInitialTaskFormValues({
        projectId: project?.id,
        workspaceId: workspace?.id,
        currentUserId,
      }),
    [currentUserId, project?.id, workspace?.id]
  );

  const [createTaskValues, setCreateTaskValues] = useState(initialTaskFormValues);

  const projectUserOptions = useMemo(() => {
    const options = projectUsers.map((projectUser) => ({
      id: Number(projectUser.user?.id || projectUser.userId),
      label: buildUserLabel(projectUser.user || {}),
    }));

    if (currentUserId && !options.some((option) => option.id === currentUserId)) {
      options.unshift({
        id: currentUserId,
        label: currentUserLabel,
      });
    }

    return options;
  }, [currentUserId, currentUserLabel, projectUsers]);

  const totalTasks = pagination.total;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalTasks === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const pageEndIndex = totalTasks === 0 ? 0 : Math.min(pageStartIndex + tasks.length, totalTasks);

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set([1, totalPages, safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1]);

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [safeCurrentPage, totalPages]);

  useEffect(() => {
    if (!isCreateTaskModalOpen) {
      setCreateTaskValues(initialTaskFormValues);
    }
  }, [initialTaskFormValues, isCreateTaskModalOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchValue, rowsPerPage]);

  useEffect(() => {
    const loadProjectUsers = async () => {
      if (!authSession?.token || !project?.id) {
        setProjectUsers([]);
        return;
      }

      try {
        const result = await fetchProjectUsers(project.id, authSession.token);
        setProjectUsers(Array.isArray(result?.users) ? result.users : []);
      } catch {
        setProjectUsers([]);
      }
    };

    void loadProjectUsers();
  }, [authSession?.token, project?.id]);

  useEffect(() => {
    const loadTasks = async () => {
      if (!authSession?.token || !project?.id) {
        setTasks([]);
        setPagination({
          page: 1,
          limit: rowsPerPage,
          total: 0,
          totalPages: 1,
        });
        return;
      }

      setIsLoadingTasks(true);

      try {
        const result = await fetchTasks(authSession.token, {
          projectId: project.id,
          workspaceId: workspace?.id,
          search: debouncedSearchValue,
          page: currentPage,
          limit: rowsPerPage,
        });

        setTasks(
          Array.isArray(result?.tasks)
            ? result.tasks.map((task) => mapApiTaskToTableRow(task))
            : []
        );
        setPagination({
          page: Number(result?.pagination?.page || currentPage),
          limit: Number(result?.pagination?.limit || rowsPerPage),
          total: Number(result?.pagination?.total || 0),
          totalPages: Number(result?.pagination?.totalPages || 1),
        });
      } catch (error) {
        setTasks([]);
        setPagination({
          page: 1,
          limit: rowsPerPage,
          total: 0,
          totalPages: 1,
        });
        await showErrorAlert(
          "Unable to load tasks",
          error.message || "Something went wrong while loading tasks."
        );
      } finally {
        setIsLoadingTasks(false);
      }
    };

    void loadTasks();
  }, [
    authSession?.token,
    currentPage,
    debouncedSearchValue,
    project?.id,
    reloadTasksKey,
    rowsPerPage,
    workspace?.id,
  ]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const handleTaskFieldChange = (field, value) => {
    setCreateTaskValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleCloseCreateTaskModal = async (forceClose = false) => {
    if (isCreatingTask) {
      return;
    }

    if (!forceClose && areTaskFormValuesDirty(createTaskValues, initialTaskFormValues)) {
      const confirmation = await showConfirmAlert(
        "Discard task draft?",
        "You have unsaved task changes. Closing now will discard them.",
        {
          confirmButtonText: "Discard",
          cancelButtonText: "Keep Editing",
        }
      );

      if (!confirmation.isConfirmed) {
        return;
      }
    }

    setIsCreateTaskModalOpen(false);
    setCreateTaskValues(initialTaskFormValues);
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    if (!authSession?.token) {
      await showErrorAlert("Signin required", "Please sign in again to create a task.");
      return;
    }

    if (!project?.id || !workspace?.id) {
      await showErrorAlert(
        "Project context missing",
        "We could not resolve the current project or workspace."
      );
      return;
    }

    setIsCreatingTask(true);

    try {
      const payload = {
        title: createTaskValues.title.trim(),
        description: createTaskValues.description.trim(),
        status: createTaskValues.status,
        priority: createTaskValues.priority,
        taskType: createTaskValues.taskType,
        assignedBy: createTaskValues.assignedBy || undefined,
        assignedTo: createTaskValues.assignedTo || undefined,
        projectId: Number(project.id),
        workspaceId: Number(workspace.id),
        startDate: createTaskValues.startDate || undefined,
        dueDate: createTaskValues.dueDate || undefined,
        completedDate: createTaskValues.completedDate || undefined,
        tags: createTaskValues.tags,
        comments: createTaskValues.comments.trim(),
        activityLogs: createTaskValues.activityLogs.trim(),
      };

      const result = await createTask(payload, authSession.token);

      await showSuccessAlert(
        "Task created",
        result?.message || "The task has been created successfully."
      );

      await handleCloseCreateTaskModal(true);
      setCurrentPage(1);
      setReloadTasksKey((currentValue) => currentValue + 1);
    } catch (error) {
      await showErrorAlert(
        "Unable to create task",
        error.message || "Something went wrong while creating the task."
      );
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!authSession?.token) {
      await showErrorAlert("Signin required", "Please sign in again to delete a task.");
      return;
    }

    const confirmation = await showConfirmAlert(
      "Delete task?",
      `This will remove ${task.title} from the project.`,
      {
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingTaskIds((currentIds) => [...currentIds, task.rawId]);

    try {
      const result = await deleteTask(task.rawId, authSession.token);

      await showSuccessAlert(
        "Task deleted",
        result?.message || "The task has been deleted successfully."
      );

      const isOnlyRowOnPage = tasks.length === 1 && currentPage > 1;

      if (isOnlyRowOnPage) {
        setCurrentPage((page) => Math.max(1, page - 1));
      } else {
        setReloadTasksKey((currentValue) => currentValue + 1);
      }
    } catch (error) {
      await showErrorAlert(
        "Unable to delete task",
        error.message || "Something went wrong while deleting the task."
      );
    } finally {
      setDeletingTaskIds((currentIds) => currentIds.filter((id) => id !== task.rawId));
    }
  };

  const handleShowTask = (task) => {
    if (!workspace?.slug || !project?.slug || !task?.rawId) {
      return;
    }

    navigate(
      buildTaskDetailsRoute(
        workspace.slug,
        project.slug,
        task.rawTask?.slug || task.slug
      ),
      {
        state: {
          workspace,
          project,
          task: task.rawTask || {
            id: task.rawId,
            slug: task.slug,
            title: task.title,
            projectId: Number(task.projectId),
            workspaceId: Number(task.workspaceId),
          },
        },
      }
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.5, md: 2 },
        overflowX: "hidden",
      }}
    >
      <Sheet
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          borderRadius: "10px",
          borderColor: "rgba(220, 226, 244, 0.95)",
          backgroundColor: "#fff",
          overflow: "hidden",
          boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
        }}
      >
        <Stack spacing={0} sx={{ width: "100%", minWidth: 0, maxWidth: "100%" }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
            sx={{ px: 2, py: 2.25 }}
          >
            <Stack spacing={0.5}>
              <Typography
                level="title-lg"
                sx={{ fontWeight: 700, color: "var(--color-font-primary)", fontSize: "1.2rem" }}
              >
                Tasks
              </Typography>
              <Typography level="body-sm" sx={{ color: "#5c6d90", maxWidth: 620 }}>
                Review task definitions, assignments, timelines, comments, and activity history for {projectTitle}.
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ minWidth: 0 }}>
              <Input
                startDecorator={<SearchIcon />}
                placeholder="Search by ID, title, assignee, type, status, priority, or tag"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                sx={{
                  minWidth: { xs: "100%", sm: 360 },
                  borderRadius: "14px",
                }}
              />
              <Button
                startDecorator={<PlusIcon />}
                onClick={() => {
                  setCreateTaskValues(initialTaskFormValues);
                  setIsCreateTaskModalOpen(true);
                }}
                sx={{
                  minHeight: "42px",
                  color: "var(--color-font-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                Create Task
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              overflowX: "auto",
              borderTop: "1px solid rgba(223, 228, 243, 0.9)",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(120, 130, 154, 0.65) transparent",
              "&::-webkit-scrollbar": {
                height: "6px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(120, 130, 154, 0.65)",
                borderRadius: "999px",
              },
            }}
          >
            <Table
              borderAxis="xBetween"
              stripe="even"
              sx={{
                minWidth: 1500,
                "--TableCell-headBackground": "transparent",
                "--TableCell-selectedBackground": "transparent",
                "& thead th:nth-of-type(1)": {
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  backgroundColor: "#fff",
                },
                "& thead th:nth-of-type(2)": {
                  position: "sticky",
                  left: "102px",
                  zIndex: 3,
                  backgroundColor: "#fff",
                  boxShadow: "inset -1px 0 0 rgba(223, 228, 243, 0.95)",
                },
                "& thead th": {
                  py: 1.5,
                  px: 2,
                  color: "#60708e",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  textTransform: "uppercase",
                  borderBottom: "1px solid rgba(223, 228, 243, 0.9)",
                },
                "& tbody td:nth-of-type(1)": {
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  backgroundColor: "#fff",
                },
                "& tbody td:nth-of-type(2)": {
                  position: "sticky",
                  left: "102px",
                  zIndex: 2,
                  backgroundColor: "#fff",
                  boxShadow: "inset -1px 0 0 rgba(236, 240, 249, 0.95)",
                },
                "& tbody td": {
                  py: 1.15,
                  px: 2,
                  color: "var(--color-font-primary)",
                  borderBottom: "1px solid rgba(236, 240, 249, 0.9)",
                  verticalAlign: "middle",
                },
                "& tbody tr:nth-of-type(even)": {
                  backgroundColor: "#fcfdff",
                },
                "& tbody tr:hover td": {
                  backgroundColor: "#f7f9ff",
                },
                "& tbody tr:nth-of-type(even) td:nth-of-type(1), & tbody tr:nth-of-type(even) td:nth-of-type(2)": {
                  backgroundColor: "#fcfdff",
                },
                "& tbody tr:hover td:nth-of-type(1), & tbody tr:hover td:nth-of-type(2)": {
                  backgroundColor: "#f7f9ff",
                },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: "102px" }}>ID</th>
                  <th style={{ width: "260px", minWidth: "260px" }}>Title</th>
                  <th style={{ width: "140px", minWidth: "140px" }}>Status</th>
                  <th style={{ width: "140px", minWidth: "140px" }}>Priority</th>
                  <th style={{ width: "160px", minWidth: "160px" }}>Assigned By</th>
                  <th style={{ width: "160px", minWidth: "160px" }}>Assigned To</th>
                  <th style={{ width: "160px", minWidth: "160px" }}>Created By</th>
                  <th style={{ width: "140px", minWidth: "140px" }}>Start Date</th>
                  <th style={{ width: "140px", minWidth: "140px" }}>Due Date</th>
                  <th style={{ width: "170px", minWidth: "170px" }}>Completed Date</th>
                  <th style={{ width: "150px", minWidth: "150px" }}>Task Type</th>
                  <th style={{ width: "220px", minWidth: "220px" }}>Tags</th>
                  <th style={{ width: "130px", minWidth: "130px" }}>Comments</th>
                  <th style={{ width: "140px", minWidth: "140px" }}>Activity Logs</th>
                  <th style={{ width: "120px", minWidth: "120px" }}>Project ID</th>
                  <th style={{ width: "130px", minWidth: "130px" }}>Workspace ID</th>
                  <th style={{ width: "170px", minWidth: "170px" }}>Created At</th>
                  <th style={{ width: "170px", minWidth: "170px" }}>Updated At</th>
                  <th style={{ width: "120px", minWidth: "120px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTasks ? (
                  <tr>
                    <td colSpan={19}>
                      <Stack alignItems="center" spacing={0.75} sx={{ py: 5 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          Loading tasks...
                        </Typography>
                      </Stack>
                    </td>
                  </tr>
                ) : null}
                {!isLoadingTasks && tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <Typography sx={{ color: "#3155ff", fontWeight: 700 }}>
                        {task.id}
                      </Typography>
                    </td>
                    <td>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ width: "100%" }}
                      >
                        <Typography sx={{ fontWeight: 700, color: "#4b5563" }}>
                          <Box
                            component="button"
                            type="button"
                            onClick={() => handleShowTask(task)}
                            sx={{
                              border: "none",
                              background: "transparent",
                              p: 0,
                              m: 0,
                              font: "inherit",
                              color: "#4b5563",
                              fontWeight: 700,
                              cursor: "pointer",
                              "&:hover": {
                                color: "#3155ff",
                              },
                            }}
                          >
                            {task.title}
                          </Box>
                        </Typography>
                        <Tooltip title="Show task" variant="soft">
                          <IconButton
                            variant="plain"
                            sx={{
                              color: "#3155ff",
                              opacity: 0,
                              transition: "opacity 0.18s ease",
                              "tr:hover &": {
                                opacity: 1,
                              },
                            }}
                            onClick={() => {
                              handleShowTask(task);
                            }}
                          >
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        sx={{ borderRadius: "999px", fontWeight: 700, ...statusStyles[task.status] }}
                      >
                        {task.status}
                      </Chip>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        sx={{ borderRadius: "999px", fontWeight: 700, ...priorityStyles[task.priority] }}
                      >
                        {task.priority}
                      </Chip>
                    </td>
                    <td>{task.assignedBy}</td>
                    <td>{task.assignedTo}</td>
                    <td>{task.createdBy}</td>
                    <td>{formatDateLabel(task.startDate)}</td>
                    <td>{formatDateLabel(task.dueDate)}</td>
                    <td>{formatDateLabel(task.completedDate)}</td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        sx={{ borderRadius: "999px", fontWeight: 700, ...typeStyles[task.taskType] }}
                      >
                        {task.taskType}
                      </Chip>
                    </td>
                    <td>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {task.tags.map((tag) => (
                          <Chip
                            key={tag}
                            size="sm"
                            variant="soft"
                            sx={{
                              borderRadius: "999px",
                              backgroundColor: "#eef2ff",
                              color: "#3155ff",
                              fontWeight: 600,
                            }}
                          >
                            {tag}
                          </Chip>
                        ))}
                      </Stack>
                    </td>
                    <td>{task.comments}</td>
                    <td>{task.activityLogs}</td>
                    <td>{task.projectId}</td>
                    <td>{task.workspaceId}</td>
                    <td>{formatDateLabel(task.createdAt, true)}</td>
                    <td>{formatDateLabel(task.updatedAt, true)}</td>
                    <td>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Edit task" variant="soft">
                          <IconButton
                            variant="plain"
                            sx={{ color: "#3155ff" }}
                            onClick={() => {
                              handleShowTask(task);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete task" variant="soft">
                          <IconButton
                            variant="plain"
                            color="danger"
                            loading={deletingTaskIds.includes(task.rawId)}
                            disabled={deletingTaskIds.includes(task.rawId)}
                            onClick={() => {
                              void handleDeleteTask(task);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </td>
                  </tr>
                ))}
                {!isLoadingTasks && tasks.length === 0 ? (
                  <tr>
                    <td colSpan={19}>
                      <Stack alignItems="center" spacing={0.75} sx={{ py: 5 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          No tasks found
                        </Typography>
                        <Typography level="body-sm" sx={{ color: "#7b8596" }}>
                          Try a different title, assignee, type, status, priority, or tag.
                        </Typography>
                      </Stack>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{
              px: 2,
              py: 2,
              borderTop: "1px solid rgba(223, 228, 243, 0.9)",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Typography level="body-sm" sx={{ color: "#60708e" }}>
                Rows per page
              </Typography>
              <Select
                value={rowsPerPage}
                size="sm"
                onChange={(_, value) => {
                  if (value) {
                    setRowsPerPage(value);
                  }
                }}
                sx={{
                  minWidth: 76,
                  borderRadius: "8px",
                  "--Select-focusedHighlight": "rgba(49, 85, 255, 0.18)",
                }}
              >
                <Option value={5}>5</Option>
                <Option value={10}>10</Option>
                <Option value={25}>25</Option>
                <Option value={50}>50</Option>
              </Select>
              <Typography level="body-sm" sx={{ color: "#60708e" }}>
                {totalTasks > 0
                  ? `${pageStartIndex + 1}-${pageEndIndex} of ${totalTasks}`
                  : "0 of 0"}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
              <Button
                variant="plain"
                color="neutral"
                disabled={safeCurrentPage === 1 || totalTasks === 0 || isLoadingTasks}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                sx={{
                  minHeight: 34,
                  px: 1.25,
                  borderRadius: "8px",
                  color: "#60708e",
                }}
              >
                Previous
              </Button>

              {paginationItems.map((pageNumber, index) => {
                const previousPage = paginationItems[index - 1];
                const showGap = previousPage && pageNumber - previousPage > 1;

                return (
                  <Stack key={pageNumber} direction="row" spacing={0.75} alignItems="center">
                    {showGap ? (
                      <Typography level="body-sm" sx={{ color: "#98a3bd", px: 0.25 }}>
                        ...
                      </Typography>
                    ) : null}
                    <Button
                      variant={pageNumber === safeCurrentPage ? "solid" : "plain"}
                      color={pageNumber === safeCurrentPage ? "primary" : "neutral"}
                      onClick={() => setCurrentPage(pageNumber)}
                      sx={{
                        minWidth: 36,
                        height: 36,
                        p: 0,
                        borderRadius: "8px",
                        fontWeight: 700,
                        color: pageNumber === safeCurrentPage ? "#fff" : "#60708e",
                        backgroundColor:
                          pageNumber === safeCurrentPage ? "#3155ff" : "transparent",
                        border:
                          pageNumber === safeCurrentPage
                            ? "1px solid #3155ff"
                            : "1px solid rgba(223, 228, 243, 0.9)",
                        "&:hover": {
                          backgroundColor:
                            pageNumber === safeCurrentPage
                              ? "#2848d6"
                              : "rgba(232, 237, 255, 0.75)",
                        },
                      }}
                    >
                      {pageNumber}
                    </Button>
                  </Stack>
                );
              })}

              <Button
                variant="plain"
                color="neutral"
                disabled={safeCurrentPage === totalPages || totalTasks === 0 || isLoadingTasks}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                sx={{
                  minHeight: 34,
                  px: 1.25,
                  borderRadius: "8px",
                  color: "#60708e",
                }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Sheet>

      <CreateTaskModal
        open={isCreateTaskModalOpen}
        values={createTaskValues}
        projectUserOptions={projectUserOptions}
        projectTitle={projectTitle}
        loading={isCreatingTask}
        onClose={handleCloseCreateTaskModal}
        onChange={handleTaskFieldChange}
        onSubmit={handleCreateTask}
      />
    </Box>
  );
}
