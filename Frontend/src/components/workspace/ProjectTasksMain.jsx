import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import UnfoldMoreRounded from "@mui/icons-material/UnfoldMoreRounded";
import { Box, Button, Chip, DialogContent, DialogTitle, Dropdown, FormControl, FormLabel, IconButton, Input, Menu, MenuButton, MenuItem, Modal, ModalClose, ModalDialog, Option, Select, Sheet, Stack, Table, Tooltip, Typography } from "@mui/joy";
import { useTheme } from "@mui/joy/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../services/alert.service";
import { fetchProjectUsers } from "../../services/project.service";
import { fetchAllWorkspaceUsers } from "../../services/workspace.service";
import {
  createTask,
  deleteTask,
  exportTasksJson,
  fetchTasks,
  importTasksJson,
  updateTask,
} from "../../services/task.service";
import {
  buildTaskDetailsRoute,
} from "../../router/authRoutes";
import CreateTaskModal from "./CreateTaskModal";
import {
  DeleteIcon,
  EyeIcon,
  EditIcon,
  ExportIcon,
  FilterIcon,
  ImportIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
} from "./WorkspaceIcons";

const taskStatusFilterOptions = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const taskPriorityFilterOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const initialPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const initialTaskColumnFilters = {
  id: "",
  title: "",
  status: "",
  priority: "",
  dueDate: "",
  assignedTo: "",
  assignedBy: "",
  tags: "",
  updatedAt: "",
  createdAt: "",
};

const sortableTaskColumns = [
  { key: "id", label: "ID", style: { width: "102px", minWidth: "102px" } },
  { key: "title", label: "Task Name", style: { width: "300px", minWidth: "300px" } },
  { key: "status", label: "Status", style: { width: "140px", minWidth: "140px" } },
  { key: "priority", label: "Priority", style: { width: "140px", minWidth: "140px" } },
  { key: "dueDate", label: "Due Date", style: { width: "140px", minWidth: "140px" } },
  { key: "assignedTo", label: "Assignee", style: { width: "160px", minWidth: "160px" } },
  { key: "assignedBy", label: "Assigned By", style: { width: "160px", minWidth: "160px" } },
];

const taskPageSizes = [5, 10, 25, 50];
const taskViewQueryKeys = [
  "search",
  ...Object.keys(initialTaskColumnFilters),
  "sort",
  "sortBy",
  "sortOrder",
  "page",
  "limit",
];

const readTaskViewState = (searchParams) => {
  const allowedStatuses = new Set(taskStatusFilterOptions.map((option) => option.value));
  const allowedPriorities = new Set(taskPriorityFilterOptions.map((option) => option.value));
  const allowedSortFields = new Set(sortableTaskColumns.map((column) => column.key));
  const filters = Object.fromEntries(
    Object.keys(initialTaskColumnFilters).map((key) => [
      key,
      String(searchParams.get(key) || "").trim(),
    ])
  );

  if (filters.status && !allowedStatuses.has(filters.status)) {
    filters.status = "";
  }

  if (filters.priority && !allowedPriorities.has(filters.priority)) {
    filters.priority = "";
  }

  const sortRules = [];
  const requestedSort = String(searchParams.get("sort") || "").trim();

  requestedSort.split(",").filter(Boolean).forEach((entry) => {
    const [field, order, ...extraParts] = entry.split(":").map((part) => part.trim());

    if (
      extraParts.length === 0 &&
      allowedSortFields.has(field) &&
      ["asc", "desc"].includes(order) &&
      !sortRules.some((rule) => rule.field === field)
    ) {
      sortRules.push({ field, order });
    }
  });

  if (sortRules.length === 0) {
    const requestedSortBy = String(searchParams.get("sortBy") || "").trim();
    const requestedSortOrder = String(searchParams.get("sortOrder") || "").trim().toLowerCase();

    if (allowedSortFields.has(requestedSortBy) && ["asc", "desc"].includes(requestedSortOrder)) {
      sortRules.push({ field: requestedSortBy, order: requestedSortOrder });
    }
  }
  const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);

  return {
    search: String(searchParams.get("search") || "").trim(),
    filters,
    sortRules,
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: taskPageSizes.includes(requestedLimit) ? requestedLimit : 10,
  };
};

const hasActiveTaskColumnFilters = (filters = {}) =>
  Object.values(filters).some((value) => String(value || "").trim() !== "");

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

const toTitleCase = (value = "") =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatTaskCode = (taskNumber) => `TSK-${taskNumber}`;

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

const buildHoveredCellKey = (taskId, field) => `${taskId}:${field}`;

const buildUserLabel = (user = {}) =>
  `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim() ||
  user.email ||
  `User ${user.id}`;

const mapWorkspaceUserToOption = (workspaceUser) => ({
  id: Number(workspaceUser.id || workspaceUser.userId),
  label: buildUserLabel(workspaceUser),
});

const mapProjectUserToOption = (projectUser) => ({
  id: Number(projectUser.user?.id || projectUser.userId),
  label: buildUserLabel(projectUser.user || {}),
});

const mapApiTaskToTableRow = (task) => ({
  rawId: Number(task.id),
  rawTask: task,
  slug: task.slug || "",
  title: task.title,
  status: toTitleCase(task.status),
  priority: toTitleCase(task.priority),
  dueDate: task.dueDate || "",
  assignedTo: task.assignedToName || "-",
  assignedBy: task.assignedByName || "-",
  parentTaskId: task.parentTaskId || null,
  parentTaskTitle: task.parentTaskTitle || "",
  parentTaskProjectTaskNumber: task.parentTaskProjectTaskNumber || null,
  subtasksCount: Number(task.subtasksCount || 0),
  tags: Array.isArray(task.tags) ? task.tags : [],
  updatedAt: task.updatedAt || "",
  createdAt: task.createdAt || "",
  id: formatTaskCode(task.projectTaskNumber || task.id),
  description: task.description || "",
  createdBy: task.createdByName || "-",
  startDate: task.startDate || "",
  completedDate: task.completedAt || "",
  taskType: toTitleCase(task.taskType),
  comments: Number(task.commentsCount || 0),
  activityLogs: Number(task.activityLogsCount || 0),
  projectId: String(task.projectId || "-"),
  workspaceId: String(task.workspaceId || "-"),
});

const buildEditableTaskValues = (task) => ({
  title: String(task?.title || ""),
  status: String(task?.rawTask?.status || "todo"),
  priority: String(task?.rawTask?.priority || "medium"),
  dueDate: String(task?.rawTask?.dueDate || ""),
  assignedTo: task?.rawTask?.assignedTo ? String(task.rawTask.assignedTo) : "",
  assignedBy: task?.rawTask?.assignedBy ? String(task.rawTask.assignedBy) : "",
  tags: Array.isArray(task?.rawTask?.tags)
    ? task.rawTask.tags.join(", ")
    : "",
});

function OverflowTooltip({ title, children, maxLines = 1 }) {
  const contentRef = useRef(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    const measureOverflow = () => {
      const element = contentRef.current;

      if (!element) {
        setIsOverflowed(false);
        return;
      }

      setIsOverflowed(
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
      );
    };

    measureOverflow();
    window.addEventListener("resize", measureOverflow);

    return () => {
      window.removeEventListener("resize", measureOverflow);
    };
  }, [title, maxLines]);

  return (
    <Tooltip title={isOverflowed ? title : ""} placement="top" disableHoverListener={!isOverflowed}>
      <Box
        ref={contentRef}
        component="span"
        sx={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: maxLines,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

export default function ProjectTasksMain({
  projectTitle = "Project",
  project = null,
  workspace = null,
}) {
  const theme = useTheme();
  const enableInlineTitleEditing = useMediaQuery(theme.breakpoints.up("lg"));
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTaskViewStateRef = useRef(null);

  if (!initialTaskViewStateRef.current) {
    initialTaskViewStateRef.current = readTaskViewState(searchParams);
  }

  const initialTaskViewState = initialTaskViewStateRef.current;
  const [searchValue, setSearchValue] = useState(initialTaskViewState.search);
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(initialTaskViewState.search);
  const [columnFilters, setColumnFilters] = useState(initialTaskViewState.filters);
  const [draftColumnFilters, setDraftColumnFilters] = useState(initialTaskViewState.filters);
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState(initialTaskViewState.filters);
  const [rowsPerPage, setRowsPerPage] = useState(initialTaskViewState.limit);
  const [sortRules, setSortRules] = useState(initialTaskViewState.sortRules);
  const [currentPage, setCurrentPage] = useState(initialTaskViewState.page);
  const [pagination, setPagination] = useState(initialPagination);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [reloadTasksKey, setReloadTasksKey] = useState(0);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [deletingTaskIds, setDeletingTaskIds] = useState([]);
  const [isExportingTasks, setIsExportingTasks] = useState(false);
  const [isImportingTasks, setIsImportingTasks] = useState(false);
  const [projectUsers, setProjectUsers] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [taskDrafts, setTaskDrafts] = useState({});
  const [savingTaskIds, setSavingTaskIds] = useState([]);
  const [hoveredCellKey, setHoveredCellKey] = useState("");
  const [editingTitleTaskId, setEditingTitleTaskId] = useState(null);
  const importFileInputRef = useRef(null);
  const hasMountedTaskViewRef = useRef(false);
  const showClearFilters = hasActiveTaskColumnFilters(columnFilters);
  const activeFilterCount = Object.values(columnFilters).filter(
    (value) => String(value || "").trim() !== ""
  ).length;

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

  const assigneeOptions = useMemo(() => {
    const projectAccess = String(project?.access || "").trim().toLowerCase();
    const baseOptions =
      projectAccess === "public"
        ? workspaceUsers.map(mapWorkspaceUserToOption)
        : projectUsers.map(mapProjectUserToOption);
    const options = [...baseOptions];

    if (currentUserId && !options.some((option) => option.id === currentUserId)) {
      options.unshift({
        id: currentUserId,
        label: currentUserLabel,
      });
    }

    return options;
  }, [currentUserId, currentUserLabel, project?.access, projectUsers, workspaceUsers]);

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
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [columnFilters]);

  useEffect(() => {
    if (!hasMountedTaskViewRef.current) {
      hasMountedTaskViewRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [debouncedSearchValue, debouncedColumnFilters, rowsPerPage]);

  useEffect(() => {
    setSearchParams((currentSearchParams) => {
      const nextSearchParams = new URLSearchParams(currentSearchParams);

      taskViewQueryKeys.forEach((key) => nextSearchParams.delete(key));

      if (debouncedSearchValue) {
        nextSearchParams.set("search", debouncedSearchValue);
      }

      Object.entries(debouncedColumnFilters).forEach(([key, value]) => {
        const normalizedValue = String(value || "").trim();

        if (normalizedValue) {
          nextSearchParams.set(key, normalizedValue);
        }
      });

      if (sortRules.length > 0) {
        nextSearchParams.set(
          "sort",
          sortRules.map(({ field, order }) => `${field}:${order}`).join(",")
        );
      }

      if (currentPage > 1) {
        nextSearchParams.set("page", String(currentPage));
      }

      if (rowsPerPage !== 10) {
        nextSearchParams.set("limit", String(rowsPerPage));
      }

      return nextSearchParams;
    }, { replace: true });
  }, [
    currentPage,
    debouncedColumnFilters,
    debouncedSearchValue,
    rowsPerPage,
    setSearchParams,
    sortRules,
  ]);

  useEffect(() => {
    const loadAssignableUsers = async () => {
      if (!authSession?.token || !project?.id) {
        setProjectUsers([]);
        setWorkspaceUsers([]);
        return;
      }

      try {
        if (String(project?.access || "").trim().toLowerCase() === "public") {
          if (!workspace?.id) {
            setWorkspaceUsers([]);
            setProjectUsers([]);
            return;
          }

          const users = await fetchAllWorkspaceUsers(workspace.id, authSession.token);
          setWorkspaceUsers(Array.isArray(users) ? users : []);
          setProjectUsers([]);
          return;
        }

        const result = await fetchProjectUsers(project.id, authSession.token);
        setProjectUsers(Array.isArray(result?.users) ? result.users : []);
        setWorkspaceUsers([]);
      } catch {
        setProjectUsers([]);
        setWorkspaceUsers([]);
      }
    };

    void loadAssignableUsers();
  }, [authSession?.token, project?.access, project?.id, workspace?.id]);

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
          ...debouncedColumnFilters,
          sort: sortRules.map(({ field, order }) => `${field}:${order}`).join(","),
          page: currentPage,
          limit: rowsPerPage,
        });

        setTasks(
          Array.isArray(result?.tasks)
            ? result.tasks.map((task) => mapApiTaskToTableRow(task))
            : []
        );
        const nextTotalPages = Number(result?.pagination?.totalPages || 1);

        setPagination({
          page: Number(result?.pagination?.page || currentPage),
          limit: Number(result?.pagination?.limit || rowsPerPage),
          total: Number(result?.pagination?.total || 0),
          totalPages: nextTotalPages,
        });

        if (currentPage > nextTotalPages) {
          setCurrentPage(Math.max(1, nextTotalPages));
        }
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
    debouncedColumnFilters,
    project?.id,
    reloadTasksKey,
    rowsPerPage,
    sortRules,
    workspace?.id,
  ]);

  useEffect(() => {
    setTaskDrafts((currentDrafts) => {
      const nextDrafts = {};

      tasks.forEach((task) => {
        nextDrafts[task.rawId] = currentDrafts[task.rawId] || buildEditableTaskValues(task);
      });

      return nextDrafts;
    });
  }, [tasks]);

  const handleColumnFilterChange = (field, value) => {
    setDraftColumnFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleClearColumnFilters = () => {
    setDraftColumnFilters(initialTaskColumnFilters);
  };

  const handleOpenFilterModal = () => {
    setDraftColumnFilters({ ...columnFilters });
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setDraftColumnFilters({ ...columnFilters });
    setIsFilterModalOpen(false);
  };

  const handleApplyColumnFilters = () => {
    const nextFilters = { ...draftColumnFilters };
    setColumnFilters(nextFilters);
    setDebouncedColumnFilters(nextFilters);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const handleSort = (column) => {
    setSortRules((currentRules) => {
      const existingRule = currentRules.find((rule) => rule.field === column);

      if (!existingRule) {
        return [...currentRules, { field: column, order: "asc" }];
      }

      if (existingRule.order === "asc") {
        return currentRules.map((rule) =>
          rule.field === column ? { ...rule, order: "desc" } : rule
        );
      }

      return currentRules.filter((rule) => rule.field !== column);
    });

    setCurrentPage(1);
  };

  const flushTaskAutosave = async (taskId, draftOverride = null) => {
    const task = tasks.find((currentTask) => currentTask.rawId === taskId);
    const draft = draftOverride || taskDrafts[taskId];

    if (!task || !draft || !authSession?.token) {
      return;
    }

    const trimmedTitle = draft.title.trim();

    if (!trimmedTitle) {
      return;
    }

    const normalizedTags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const nextPayload = {
      title: trimmedTitle,
      description: task.rawTask?.description || "",
      status: draft.status || "todo",
      priority: draft.priority || "medium",
      taskType: task.rawTask?.taskType || "feature",
      parentTaskId: task.rawTask?.parentTaskId || undefined,
      assignedBy: draft.assignedBy ? Number(draft.assignedBy) : undefined,
      assignedTo: draft.assignedTo ? Number(draft.assignedTo) : undefined,
      startDate: task.rawTask?.startDate || undefined,
      dueDate: draft.dueDate || undefined,
      completedAt: task.rawTask?.completedAt || undefined,
      tags: normalizedTags,
    };

    const hasChanges =
      trimmedTitle !== String(task.rawTask?.title || "") ||
      nextPayload.status !== String(task.rawTask?.status || "todo") ||
      nextPayload.priority !== String(task.rawTask?.priority || "medium") ||
      String(nextPayload.dueDate || "") !== String(task.rawTask?.dueDate || "") ||
      String(nextPayload.assignedTo || "") !== String(task.rawTask?.assignedTo || "") ||
      String(nextPayload.assignedBy || "") !== String(task.rawTask?.assignedBy || "") ||
      JSON.stringify(normalizedTags) !==
      JSON.stringify(Array.isArray(task.rawTask?.tags) ? task.rawTask.tags : []);

    if (!hasChanges) {
      return;
    }

    setSavingTaskIds((currentIds) =>
      currentIds.includes(taskId) ? currentIds : [...currentIds, taskId]
    );

    try {
      const result = await updateTask(taskId, nextPayload, authSession.token);
      const updatedTask = result?.task;

      if (!updatedTask) {
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.rawId === taskId ? mapApiTaskToTableRow(updatedTask) : currentTask
        )
      );

      setTaskDrafts((currentDrafts) => ({
        ...currentDrafts,
        [taskId]: buildEditableTaskValues(mapApiTaskToTableRow(updatedTask)),
      }));

      await showSuccessAlert(
        "Task updated",
        result?.message || "The task has been updated successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to update task",
        error.message || "Something went wrong while updating the task."
      );
    } finally {
      setSavingTaskIds((currentIds) => currentIds.filter((id) => id !== taskId));
    }
  };

  const handleInlineTaskChange = (taskId, field, value, options = {}) => {
    let nextDraft = null;

    setTaskDrafts((currentDrafts) => {
      nextDraft = {
        ...(currentDrafts[taskId] || {}),
        [field]: value,
      };

      return {
        ...currentDrafts,
        [taskId]: nextDraft,
      };
    });

    if (options.saveImmediately && nextDraft) {
      void flushTaskAutosave(taskId, nextDraft);
    }
  };

  const handleInlineTaskBlur = (taskId) => {
    if (editingTitleTaskId === taskId) {
      setEditingTitleTaskId(null);
    }

    void flushTaskAutosave(taskId);
  };

  const handleInlineCellMouseLeave = (taskId, field) => {
    const cellKey = buildHoveredCellKey(taskId, field);

    setHoveredCellKey((currentKey) => (currentKey === cellKey ? "" : currentKey));
  };

  const handleCloseCreateTaskModal = async () => {
    if (isCreatingTask) {
      return;
    }

    setIsCreateTaskModalOpen(false);
  };

  const handleCreateTask = async (taskValues) => {
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
        title: taskValues.title.trim(),
        description: taskValues.description.trim(),
        status: taskValues.status,
        priority: taskValues.priority,
        taskType: taskValues.taskType,
        assignedBy: taskValues.assignedBy || undefined,
        assignedTo: taskValues.assignedTo || undefined,
        projectId: Number(project.id),
        workspaceId: Number(workspace.id),
        startDate: taskValues.startDate || undefined,
        dueDate: taskValues.dueDate || undefined,
        completedDate: taskValues.completedDate || undefined,
        tags: taskValues.tags,
        comments: taskValues.comments.trim(),
        activityLogs: taskValues.activityLogs.trim(),
      };

      const result = await createTask(payload, authSession.token);

      await showSuccessAlert(
        "Task created",
        result?.message || "The task has been created successfully."
      );

      await handleCloseCreateTaskModal();
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

  const handleExportTasks = async () => {
    if (!authSession?.token) {
      await showErrorAlert("Signin required", "Please sign in again to export tasks.");
      return;
    }

    if (!project?.id) {
      await showErrorAlert("Project context missing", "We could not resolve the current project.");
      return;
    }

    setIsExportingTasks(true);

    try {
      const result = await exportTasksJson(authSession.token, {
        projectId: project.id,
        workspaceId: workspace?.id,
        search: debouncedSearchValue,
        ...debouncedColumnFilters,
      });

      const downloadUrl = window.URL.createObjectURL(result.blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = result.fileName || "tasks.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      await showErrorAlert(
        "Unable to export tasks",
        error.message || "Something went wrong while exporting tasks."
      );
    } finally {
      setIsExportingTasks(false);
    }
  };

  const handleOpenImportPicker = () => {
    if (isImportingTasks || !project?.id) {
      return;
    }

    importFileInputRef.current?.click();
  };

  const handleImportTasks = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Signin required", "Please sign in again to import tasks.");
      return;
    }

    if (!project?.id) {
      await showErrorAlert("Project context missing", "We could not resolve the current project.");
      return;
    }

    const confirmation = await showConfirmAlert(
      "Import tasks?",
      `This will import tasks from ${selectedFile.name} into ${projectTitle}.`,
      {
        confirmButtonText: "Import",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsImportingTasks(true);

    try {
      const result = await importTasksJson(authSession.token, {
        file: selectedFile,
        projectId: project.id,
        workspaceId: workspace?.id,
      });

      await showSuccessAlert(
        "Tasks imported",
        result?.message || "The tasks have been imported successfully."
      );

      setCurrentPage(1);
      setReloadTasksKey((currentValue) => currentValue + 1);
    } catch (error) {
      await showErrorAlert(
        "Unable to import tasks",
        error.message || "Something went wrong while importing tasks."
      );
    } finally {
      setIsImportingTasks(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        px: { xs: 1.25, md: 1.75 },
        py: { xs: 1.25, md: 1.75 },
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
            sx={{ px: 1.75, py: 1.9 }}
          >
            <Stack spacing={0.5}>
              <Typography
                level="title-lg"
                sx={{ fontWeight: 700, color: "var(--color-font-primary)", fontSize: "1.08rem" }}
              >
                Tasks
              </Typography>
              <Typography level="body-sm" sx={{ color: "#5c6d90", maxWidth: 620, fontSize: "0.82rem" }}>
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
                  minWidth: { xs: "100%", sm: 300 },
                  maxWidth: { sm: 300 },
                  "--Input-minHeight": "34px",
                  fontSize: "0.89rem",
                  borderRadius: "14px",
                }}
              />
              <Button
                variant={showClearFilters ? "soft" : "outlined"}
                color="primary"
                startDecorator={<FilterIcon />}
                endDecorator={
                  activeFilterCount ? (
                    <Chip size="sm" variant="solid" color="primary">
                      {activeFilterCount}
                    </Chip>
                  ) : null
                }
                onClick={handleOpenFilterModal}
                sx={{
                  minHeight: "34px",
                  px: 1.25,
                  borderRadius: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                Filters
              </Button>
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  void handleImportTasks(event);
                }}
                style={{ display: "none" }}
              />
              <Button
                startDecorator={<PlusIcon />}
                onClick={() => {
                  setIsCreateTaskModalOpen(true);
                }}
                sx={{
                  minHeight: "34px",
                  px: 1.35,
                  fontSize: "0.89rem",
                  color: "var(--color-font-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                Create Task
              </Button>
              <Dropdown>
                <Tooltip title="More task actions" variant="soft">
                  <MenuButton
                    slots={{ root: IconButton }}
                    variant="soft"
                    color="neutral"
                    disabled={isLoadingTasks || !project?.id}
                    sx={{
                      minWidth: 42,
                      minHeight: 42,
                      borderRadius: "14px",
                      color: "#3155ff",
                      backgroundColor: "#eef2ff",
                      "&:hover": {
                        backgroundColor: "#e3e9ff",
                      },
                    }}
                  >
                    <MenuIcon />
                  </MenuButton>
                </Tooltip>
                <Menu
                  placement="bottom-end"
                  sx={{
                    minWidth: 190,
                    borderRadius: "10px",
                    p: 0.75,
                    boxShadow: "0 18px 38px rgba(170, 180, 214, 0.16)",
                  }}
                >
                  <MenuItem
                    disabled={isImportingTasks}
                    onClick={handleOpenImportPicker}
                    sx={{ gap: 1, borderRadius: "8px" }}
                  >
                    <ImportIcon />
                    {isImportingTasks ? "Importing..." : "Import Tasks"}
                  </MenuItem>
                  <MenuItem
                    disabled={isExportingTasks}
                    onClick={() => {
                      void handleExportTasks();
                    }}
                    sx={{ gap: 1, borderRadius: "8px" }}
                  >
                    <ExportIcon />
                    {isExportingTasks ? "Exporting..." : "Export Tasks"}
                  </MenuItem>
                </Menu>
              </Dropdown>
            </Stack>
          </Stack>

          <Modal open={isFilterModalOpen} onClose={handleCloseFilterModal}>
            <ModalDialog
              layout="center"
              sx={{
                width: "min(900px, calc(100vw - 32px))",
                maxHeight: "calc(100vh - 48px)",
                borderRadius: "14px",
                p: 0,
                overflow: "hidden",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ px: { xs: 2, md: 2.5 }, py: 2, pr: 6, borderBottom: "1px solid #e4e9f5" }}
              >
                <FilterIcon sx={{ color: "#3155ff" }} />
                <DialogTitle sx={{ p: 0, color: "#1f2a44" }}>Filter tasks</DialogTitle>
                <ModalClose />
              </Stack>

              <DialogContent sx={{ px: { xs: 2, md: 2.5 }, py: 2.25, overflow: "auto" }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <FormControl>
                    <FormLabel>Task ID</FormLabel>
                    <Input
                      placeholder="TSK-1 or 1"
                      value={draftColumnFilters.id}
                      onChange={(event) => handleColumnFilterChange("id", event.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Task name</FormLabel>
                    <Input
                      placeholder="Contains task name"
                      value={draftColumnFilters.title}
                      onChange={(event) => handleColumnFilterChange("title", event.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Status</FormLabel>
                    <Select
                      placeholder="All statuses"
                      value={draftColumnFilters.status || null}
                      onChange={(_, value) => handleColumnFilterChange("status", value || "")}
                    >
                      {taskStatusFilterOptions.map((option) => (
                        <Option key={`filter-status-${option.value}`} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      placeholder="All priorities"
                      value={draftColumnFilters.priority || null}
                      onChange={(_, value) => handleColumnFilterChange("priority", value || "")}
                    >
                      {taskPriorityFilterOptions.map((option) => (
                        <Option key={`filter-priority-${option.value}`} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Due date</FormLabel>
                    <Input
                      type="date"
                      value={draftColumnFilters.dueDate}
                      onChange={(event) => handleColumnFilterChange("dueDate", event.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Assignee</FormLabel>
                    <Select
                      placeholder="All assignees"
                      value={draftColumnFilters.assignedTo || null}
                      onChange={(_, value) => handleColumnFilterChange("assignedTo", value || "")}
                    >
                      {assigneeOptions.map((option) => (
                        <Option key={`modal-assigned-to-${option.id}`} value={option.label}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Assigned by</FormLabel>
                    <Select
                      placeholder="All assigners"
                      value={draftColumnFilters.assignedBy || null}
                      onChange={(_, value) => handleColumnFilterChange("assignedBy", value || "")}
                    >
                      {assigneeOptions.map((option) => (
                        <Option key={`modal-assigned-by-${option.id}`} value={option.label}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Tags</FormLabel>
                    <Input
                      placeholder="Contains tag"
                      value={draftColumnFilters.tags}
                      onChange={(event) => handleColumnFilterChange("tags", event.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Created date</FormLabel>
                    <Input
                      type="date"
                      value={draftColumnFilters.createdAt}
                      onChange={(event) => handleColumnFilterChange("createdAt", event.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Updated date</FormLabel>
                    <Input
                      type="date"
                      value={draftColumnFilters.updatedAt}
                      onChange={(event) => handleColumnFilterChange("updatedAt", event.target.value)}
                    />
                  </FormControl>
                </Box>
              </DialogContent>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="flex-end"
                sx={{ px: { xs: 2, md: 2.5 }, py: 1.75, borderTop: "1px solid #e4e9f5" }}
              >
                <Button variant="plain" color="neutral" onClick={handleClearColumnFilters}>
                  Reset
                </Button>
                <Button startDecorator={<FilterIcon />} onClick={handleApplyColumnFilters}>
                  Apply filters
                </Button>
              </Stack>
            </ModalDialog>
          </Modal>

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
                minWidth: 1100,
                "--TableCell-headBackground": "transparent",
                "--TableCell-selectedBackground": "transparent",
                "& thead th:nth-of-type(1)": {
                  position: { xs: "static", md: "sticky" },
                  left: { md: 0 },
                  zIndex: { md: 3 },
                  backgroundColor: "#fff",
                },
                "& thead th:nth-of-type(2)": {
                  position: { xs: "static", md: "sticky" },
                  left: { md: "102px" },
                  zIndex: { md: 3 },
                  backgroundColor: "#fff",
                  boxShadow: { md: "inset -1px 0 0 rgba(223, 228, 243, 0.95)" },
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
                  position: { xs: "static", md: "sticky" },
                  left: { md: 0 },
                  zIndex: { md: 2 },
                  backgroundColor: "#fff",
                },
                "& tbody td:nth-of-type(2)": {
                  position: { xs: "static", md: "sticky" },
                  left: { md: "102px" },
                  zIndex: { md: 2 },
                  backgroundColor: "#fff",
                  boxShadow: { md: "inset -1px 0 0 rgba(236, 240, 249, 0.95)" },
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
                  {sortableTaskColumns.map((column) => {
                    const sortIndex = sortRules.findIndex((rule) => rule.field === column.key);
                    const activeSortRule = sortRules[sortIndex];
                    const isActiveSort = sortIndex >= 0;
                    const SortIcon = isActiveSort
                      ? activeSortRule.order === "asc"
                        ? ArrowUpwardRounded
                        : ArrowDownwardRounded
                      : UnfoldMoreRounded;

                    return (
                      <th
                        key={column.key}
                        style={column.style}
                        aria-sort={
                          isActiveSort
                            ? activeSortRule.order === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <Button
                          variant="plain"
                          color="neutral"
                          endDecorator={
                            <Stack direction="row" spacing={0.35} alignItems="center">
                              {isActiveSort ? (
                                <Box
                                  component="span"
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 17,
                                    height: 17,
                                    borderRadius: "50%",
                                    backgroundColor: "#3155ff",
                                    color: "#fff",
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {sortIndex + 1}
                                </Box>
                              ) : null}
                              <SortIcon
                                sx={{
                                  fontSize: "1rem",
                                  color: isActiveSort ? "#3155ff" : "#98a3bd",
                                }}
                              />
                            </Stack>
                          }
                          onClick={() => handleSort(column.key)}
                          aria-label={
                            isActiveSort
                              ? `${column.label}, sort priority ${sortIndex + 1}, ${activeSortRule.order === "asc" ? "ascending" : "descending"}`
                              : `Add ${column.label} as the next sort column`
                          }
                          sx={{
                            minHeight: 28,
                            p: 0,
                            color: isActiveSort ? "#3155ff" : "inherit",
                            font: "inherit",
                            fontWeight: "inherit",
                            letterSpacing: "inherit",
                            textTransform: "inherit",
                            whiteSpace: "nowrap",
                            "&:hover": {
                              backgroundColor: "transparent",
                              color: "#3155ff",
                            },
                          }}
                        >
                          {column.label}
                        </Button>
                      </th>
                    );
                  })}
                  <th style={{ width: "120px", minWidth: "120px" }}>Options</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTasks ? (
                  <tr>
                    <td colSpan={8}>
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
                    <td
                      onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "taskName"))}
                      onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "taskName")}
                      onClick={() => {
                        if (!enableInlineTitleEditing || editingTitleTaskId !== task.rawId) {
                          handleShowTask(task);
                        }
                      }}
                      onBlurCapture={() => {
                        if (enableInlineTitleEditing) {
                          handleInlineTaskBlur(task.rawId);
                        }
                      }}
                      style={{
                        cursor:
                          enableInlineTitleEditing && editingTitleTaskId === task.rawId
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {enableInlineTitleEditing && editingTitleTaskId === task.rawId ? (
                        <Input
                          size="sm"
                          value={taskDrafts[task.rawId]?.title ?? task.title}
                          onChange={(event) =>
                            handleInlineTaskChange(task.rawId, "title", event.target.value)
                          }
                          onBlur={() => handleInlineTaskBlur(task.rawId)}
                          autoFocus
                          slotProps={{
                            input: {
                              maxLength: 500,
                            },
                          }}
                          sx={{
                            "--Input-minHeight": "34px",
                            fontWeight: 700,
                            color: "#4b5563",
                          }}
                        />
                      ) : (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: "#4b5563",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <Box
                              component={enableInlineTitleEditing ? "button" : "span"}
                              type={enableInlineTitleEditing ? "button" : undefined}
                              onClick={(event) => {
                                if (!enableInlineTitleEditing) {
                                  return;
                                }

                                event.stopPropagation();
                                setEditingTitleTaskId(task.rawId);
                                setTaskDrafts((currentDrafts) => ({
                                  ...currentDrafts,
                                  [task.rawId]:
                                    currentDrafts[task.rawId] || buildEditableTaskValues(task),
                                }));
                              }}
                              sx={{
                                background: enableInlineTitleEditing ? "transparent" : "none",
                                p: 0,
                                m: 0,
                                font: "inherit",
                                color: "#4b5563",
                                fontWeight: 700,
                                textAlign: "left",
                                cursor: enableInlineTitleEditing ? "pointer" : "inherit",
                                display: "inline-flex",
                                alignItems: "center",
                                maxWidth: "100%",
                                minWidth: 0,
                                px: 0.75,
                                py: 0.55,
                                border: "1px solid transparent",
                                borderRadius: "8px",
                                overflow: "hidden",
                                transition: "border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease",
                                "&:hover": {
                                  borderColor: enableInlineTitleEditing
                                    ? "rgba(49, 85, 255, 0.28)"
                                    : "transparent",
                                  backgroundColor: enableInlineTitleEditing ? "#f7f9ff" : "transparent",
                                  color: enableInlineTitleEditing ? "#3155ff" : "#4b5563",
                                },
                              }}
                            >
                              <OverflowTooltip title={task.title} maxLines={2}>
                                {task.title}
                              </OverflowTooltip>
                            </Box>
                          </Typography>
                          <Tooltip title="Open task" variant="soft">
                            <IconButton
                              size="sm"
                              variant="plain"
                              sx={{
                                color: "#3155ff",
                                flexShrink: 0,
                                opacity:
                                  hoveredCellKey === buildHoveredCellKey(task.rawId, "taskName") &&
                                  (!enableInlineTitleEditing || editingTitleTaskId !== task.rawId)
                                    ? 1
                                    : 0,
                                visibility:
                                  hoveredCellKey === buildHoveredCellKey(task.rawId, "taskName") &&
                                  (!enableInlineTitleEditing || editingTitleTaskId !== task.rawId)
                                    ? "visible"
                                    : "hidden",
                                transition: "opacity 0.18s ease, visibility 0.18s ease",
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleShowTask(task);
                              }}
                            >
                              <EyeIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "status"))}
                      onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "status")}
                      onBlurCapture={() => handleInlineTaskBlur(task.rawId)}
                    >
                      {hoveredCellKey === buildHoveredCellKey(task.rawId, "status") ? (
                        <Select
                          size="sm"
                          value={taskDrafts[task.rawId]?.status ?? task.rawTask?.status ?? "todo"}
                          onChange={(_, value) =>
                            handleInlineTaskChange(task.rawId, "status", value || "todo", {
                              saveImmediately: true,
                            })
                          }
                          onClose={() => handleInlineTaskBlur(task.rawId)}
                          sx={{ minHeight: "34px", fontSize: "0.85rem" }}
                        >
                          {taskStatusFilterOptions.map((option) => (
                            <Option key={`inline-status-${task.rawId}-${option.value}`} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      ) : (
                        <Chip
                          size="sm"
                          variant="soft"
                          sx={{ borderRadius: "999px", fontWeight: 700, ...statusStyles[task.status] }}
                        >
                          {task.status}
                        </Chip>
                      )}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "priority"))}
                      onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "priority")}
                      onBlurCapture={() => handleInlineTaskBlur(task.rawId)}
                    >
                      {hoveredCellKey === buildHoveredCellKey(task.rawId, "priority") ? (
                        <Select
                          size="sm"
                          value={taskDrafts[task.rawId]?.priority ?? task.rawTask?.priority ?? "medium"}
                          onChange={(_, value) =>
                            handleInlineTaskChange(task.rawId, "priority", value || "medium", {
                              saveImmediately: true,
                            })
                          }
                          onClose={() => handleInlineTaskBlur(task.rawId)}
                          sx={{ minHeight: "34px", fontSize: "0.85rem" }}
                        >
                          {taskPriorityFilterOptions.map((option) => (
                            <Option key={`inline-priority-${task.rawId}-${option.value}`} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      ) : (
                        <Chip
                          size="sm"
                          variant="soft"
                          sx={{ borderRadius: "999px", fontWeight: 700, ...priorityStyles[task.priority] }}
                        >
                          {task.priority}
                        </Chip>
                      )}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "dueDate"))}
                      onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "dueDate")}
                      onBlurCapture={() => handleInlineTaskBlur(task.rawId)}
                    >
                      {hoveredCellKey === buildHoveredCellKey(task.rawId, "dueDate") ? (
                        <Input
                          size="sm"
                          type="date"
                          value={taskDrafts[task.rawId]?.dueDate ?? task.dueDate ?? ""}
                          onChange={(event) =>
                            handleInlineTaskChange(task.rawId, "dueDate", event.target.value, {
                              saveImmediately: true,
                            })
                          }
                          onBlur={() => handleInlineTaskBlur(task.rawId)}
                          sx={{ "--Input-minHeight": "34px", fontSize: "0.82rem" }}
                        />
                      ) : (
                        formatDateLabel(task.dueDate)
                      )}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "assignedTo"))}
                      onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "assignedTo")}
                      onBlurCapture={() => handleInlineTaskBlur(task.rawId)}
                    >
                      {hoveredCellKey === buildHoveredCellKey(task.rawId, "assignedTo") ? (
                        <Select
                          size="sm"
                          value={taskDrafts[task.rawId]?.assignedTo ?? ""}
                          onChange={(_, value) =>
                            handleInlineTaskChange(task.rawId, "assignedTo", value || "", {
                              saveImmediately: true,
                            })
                          }
                          onClose={() => handleInlineTaskBlur(task.rawId)}
                          placeholder="Assignee"
                          sx={{ minHeight: "34px", fontSize: "0.82rem" }}
                        >
                          <Option value="">Unassigned</Option>
                          {assigneeOptions.map((option) => (
                            <Option key={`inline-assigned-to-${task.rawId}-${option.id}`} value={String(option.id)}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      ) : (
                        task.assignedTo
                      )}
                    </td>
                    <td
                      onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "assignedBy"))}
                      onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "assignedBy")}
                      onBlurCapture={() => handleInlineTaskBlur(task.rawId)}
                    >
                      {hoveredCellKey === buildHoveredCellKey(task.rawId, "assignedBy") ? (
                        <Select
                          size="sm"
                          value={taskDrafts[task.rawId]?.assignedBy ?? ""}
                          onChange={(_, value) =>
                            handleInlineTaskChange(task.rawId, "assignedBy", value || "", {
                              saveImmediately: true,
                            })
                          }
                          onClose={() => handleInlineTaskBlur(task.rawId)}
                          placeholder="Assigned by"
                          sx={{ minHeight: "34px", fontSize: "0.82rem" }}
                        >
                          <Option value="">Not set</Option>
                          {assigneeOptions.map((option) => (
                            <Option key={`inline-assigned-by-${task.rawId}-${option.id}`} value={String(option.id)}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      ) : (
                        task.assignedBy
                      )}
                    </td>
                    <td>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {savingTaskIds.includes(task.rawId) ? (
                          <Typography level="body-xs" sx={{ color: "#3155ff", fontWeight: 600 }}>
                            Saving...
                          </Typography>
                        ) : null}
                        <Tooltip title="Open task" variant="soft">
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
                    <td colSpan={8}>
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
        initialValues={initialTaskFormValues}
        projectUserOptions={assigneeOptions}
        projectTitle={projectTitle}
        loading={isCreatingTask}
        onClose={handleCloseCreateTaskModal}
        onSubmit={handleCreateTask}
      />
    </Box>
  );
}
