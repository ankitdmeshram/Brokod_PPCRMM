import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import ViewKanbanRounded from "@mui/icons-material/ViewKanbanRounded";
import ViewListRounded from "@mui/icons-material/ViewListRounded";
import UnfoldMoreRounded from "@mui/icons-material/UnfoldMoreRounded";
import { Box, Button, Checkbox, Chip, DialogContent, DialogTitle, Dropdown, FormControl, FormLabel, IconButton, Input, Menu, MenuButton, MenuItem, Modal, ModalClose, ModalDialog, Option, Select, Sheet, Stack, Table, Tooltip, Typography } from "@mui/joy";
import { useTheme } from "@mui/joy/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../services/alert.service";
import {
  createProjectCustomField,
  deleteProjectCustomField,
  fetchProjectCustomFields,
  fetchProjectUsers,
  updateProjectCustomField,
  updateProjectTaskColumns,
} from "../../services/project.service";
import { fetchAllWorkspaceUsers } from "../../services/workspace.service";
import {
  bulkUpdateTasks,
  createTask,
  deleteTask,
  exportTasksJson,
  fetchAllTasks,
  fetchTasks,
  importTasksJson,
  reorderTask,
  updateTask,
} from "../../services/task.service";
import {
  buildTaskDetailsRoute,
} from "../../router/authRoutes";
import CreateTaskModal from "./CreateTaskModal";
import {
  DeleteIcon,
  EyeIcon,
  EyeOffIcon,
  EditIcon,
  ExportIcon,
  FilterIcon,
  ImportIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  ViewColumnIcon,
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

const taskTypeOptions = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "improvement", label: "Improvement" },
  { value: "research", label: "Research" },
];

const initialBulkEditValues = {
  title: "",
  description: "",
  status: "",
  priority: "",
  taskType: "",
  assignedTo: "",
  assignedBy: "",
  parentTaskId: "",
  startDate: "",
  dueDate: "",
  completedAt: "",
  tags: "",
};

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

// ID and Task Name anchor the sticky columns and always stay put; every
// other built-in column plus every custom field can be shown/hidden and
// reordered from Manage Task Columns.
const pinnedTaskColumnKeys = ["id", "title"];

const buildCustomFieldColumnKey = (fieldId) => `customField:${fieldId}`;
const isCustomFieldColumnKey = (key) => String(key || "").startsWith("customField:");
const parseCustomFieldIdFromColumnKey = (key) => String(key || "").slice("customField:".length);

// Appends newly-seen custom field keys and drops removed ones, but leaves
// every already-tracked key exactly where it is. Rebuilding from
// `manageableKeys` (a fixed, un-reordered list) instead of preserving
// `currentSettings`'s order here would silently discard any drag-reorder
// the moment another custom field is added or removed elsewhere.
const reconcileTaskColumnSettings = (currentSettings, manageableKeys) => {
  const manageableKeySet = new Set(manageableKeys);
  const reconciled = currentSettings.filter((column) => manageableKeySet.has(column.key));
  const seenKeys = new Set(reconciled.map((column) => column.key));

  manageableKeys.forEach((key) => {
    if (!seenKeys.has(key)) {
      reconciled.push({ key, visible: true });
    }
  });

  return reconciled;
};

const customFieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

// `manageableKeys` is passed in rather than read off a module constant since
// it now depends on the project's custom fields, which load asynchronously.
const buildDefaultTaskColumnSettings = (manageableKeys) =>
  manageableKeys.map((key) => ({ key, visible: true }));

const normalizeTaskColumnSettings = (rawColumns, manageableKeys) => {
  if (!Array.isArray(rawColumns) || rawColumns.length === 0) {
    return buildDefaultTaskColumnSettings(manageableKeys);
  }

  const seenKeys = new Set();
  const normalized = [];

  rawColumns.forEach((column) => {
    const key = String(column?.key || "");

    if (!manageableKeys.includes(key) || seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    normalized.push({ key, visible: column?.visible !== false });
  });

  manageableKeys.forEach((key) => {
    if (!seenKeys.has(key)) {
      normalized.push({ key, visible: true });
    }
  });

  return normalized;
};

const taskPageSizes = [5, 10, 25, 50];
const taskViewQueryKeys = [
  "search",
  ...Object.keys(initialTaskColumnFilters),
  "sort",
  "sortBy",
  "sortOrder",
  "page",
  "limit",
  "view",
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
  const requestedView = String(searchParams.get("view") || "list").trim().toLowerCase();

  return {
    search: String(searchParams.get("search") || "").trim(),
    filters,
    sortRules,
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: taskPageSizes.includes(requestedLimit) ? requestedLimit : 10,
    view: requestedView === "kanban" ? "kanban" : "list",
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

const copyTextToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard access is unavailable.");
  }
};

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

// Moves a task next to `targetTaskId` within the full task list, returning null
// when the drop is a no-op. Kanban columns are a filtered view of this same
// list, so positioning against the global array keeps a within-column drop
// correct in both views: the moved task lands between its column neighbours
// even when tasks from other columns sit between them in the global order.
const moveTaskBeside = (currentTasks, taskId, targetTaskId, placeAfter) => {
  if (taskId === targetTaskId) {
    return null;
  }

  const fromIndex = currentTasks.findIndex((task) => task.rawId === taskId);
  const targetIndex = currentTasks.findIndex((task) => task.rawId === targetTaskId);

  if (fromIndex < 0 || targetIndex < 0) {
    return null;
  }

  const nextTasks = [...currentTasks];
  const [movedTask] = nextTasks.splice(fromIndex, 1);
  const adjustedTargetIndex = nextTasks.findIndex((task) => task.rawId === targetTaskId);
  const insertIndex = placeAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex;

  if (insertIndex === fromIndex) {
    return null;
  }

  nextTasks.splice(insertIndex, 0, movedTask);

  return nextTasks;
};

// Half-way down the element decides whether the drop lands above or below it.
const shouldDropAfter = (event, element) => {
  const bounds = element.getBoundingClientRect();

  return event.clientY - bounds.top > bounds.height / 2;
};

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
  customFieldValues: { ...(task?.rawTask?.customFieldValues || {}) },
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

function TaskKanbanBoard({
  tasks,
  isLoading,
  isManualOrderActive,
  copiedTaskId,
  savingTaskIds,
  selectedTaskIds,
  onCopyTaskId,
  onMoveTask,
  onOpenTask,
  onReorderTask,
  onToggleTask,
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState("");
  const [cardDropTarget, setCardDropTarget] = useState(null);

  const clearDragState = () => {
    setDraggedTaskId(null);
    setDragOverStatus("");
    setCardDropTarget(null);
  };

  if (isLoading) {
    return (
      <Stack alignItems="center" spacing={0.75} sx={{ py: 8 }}>
        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>Loading tasks...</Typography>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${taskStatusFilterOptions.length}, minmax(280px, 1fr))`,
        gap: 1.5,
        p: 1.75,
        minWidth: `${taskStatusFilterOptions.length * 280}px`,
      }}
    >
      {taskStatusFilterOptions.map((statusOption) => {
        const columnTasks = tasks.filter(
          (task) => String(task.rawTask?.status || "").toLowerCase() === statusOption.value
        );
        const columnStyle = statusStyles[statusOption.label] || statusStyles.Todo;

        return (
          <Sheet
            key={`kanban-column-${statusOption.value}`}
            variant="soft"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOverStatus(statusOption.value);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setDragOverStatus("");
                setCardDropTarget(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = Number(event.dataTransfer.getData("text/plain") || draggedTaskId);
              const task = tasks.find((currentTask) => currentTask.rawId === taskId);

              clearDragState();

              // Dropped on empty column space, so there is no card to rank
              // against — treat it as a plain status change.
              if (task) {
                onMoveTask(task, statusOption.value);
              }
            }}
            sx={{
              minWidth: 0,
              minHeight: 420,
              p: 1.25,
              borderRadius: "12px",
              backgroundColor:
                dragOverStatus === statusOption.value ? "#eef2ff" : "#f6f8fc",
              border:
                dragOverStatus === statusOption.value
                  ? "1px dashed #3155ff"
                  : "1px solid #e5eaf5",
              boxShadow:
                dragOverStatus === statusOption.value
                  ? "inset 0 0 0 2px rgba(49, 85, 255, 0.08)"
                  : "none",
              transition: "background-color 0.16s ease, border-color 0.16s ease",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    backgroundColor: columnStyle.color,
                  }}
                />
                <Typography level="title-sm" sx={{ color: "#34415d", fontWeight: 700 }}>
                  {statusOption.label}
                </Typography>
              </Stack>
              <Chip size="sm" variant="soft" sx={{ fontWeight: 700, ...columnStyle }}>
                {columnTasks.length}
              </Chip>
            </Stack>

            <Stack spacing={1}>
              {columnTasks.map((task) => {
                const isSelected = selectedTaskIds.includes(task.rawId);
                const isDropTarget =
                  cardDropTarget?.taskId === task.rawId && draggedTaskId !== task.rawId;

                return (
                  <Sheet
                    key={`kanban-task-${task.rawId}`}
                    variant="outlined"
                    role="button"
                    tabIndex={0}
                    draggable={!savingTaskIds.includes(task.rawId)}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(task.rawId));
                      setDraggedTaskId(task.rawId);
                    }}
                    onDragEnd={clearDragState}
                    onDragOver={(event) => {
                      if (!isManualOrderActive || draggedTaskId === null) {
                        return;
                      }

                      // Claim the drop from the column so the card position,
                      // not just the column, decides where the task lands.
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStatus(statusOption.value);
                      setCardDropTarget({
                        taskId: task.rawId,
                        placeAfter: shouldDropAfter(event, event.currentTarget),
                      });
                    }}
                    onDrop={(event) => {
                      if (!isManualOrderActive || draggedTaskId === null) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      const movedTaskId = Number(
                        event.dataTransfer.getData("text/plain") || draggedTaskId
                      );
                      const placeAfter = shouldDropAfter(event, event.currentTarget);

                      clearDragState();
                      onReorderTask(movedTaskId, task, placeAfter);
                    }}
                    onClick={() => onOpenTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenTask(task);
                      }
                    }}
                    sx={{
                      p: 1.25,
                      borderRadius: "10px",
                      borderColor: isSelected ? "#3155ff" : "#dfe4f1",
                      backgroundColor: "#fff",
                      cursor: savingTaskIds.includes(task.rawId) ? "wait" : "grab",
                      opacity: draggedTaskId === task.rawId ? 0.45 : 1,
                      boxShadow: isDropTarget
                        ? cardDropTarget.placeAfter
                          ? "inset 0 -3px 0 0 #3155ff"
                          : "inset 0 3px 0 0 #3155ff"
                        : isSelected
                          ? "0 0 0 2px rgba(49, 85, 255, 0.12)"
                          : "0 5px 14px rgba(83, 96, 135, 0.08)",
                      transition: "transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease",
                      "&:active": {
                        cursor: savingTaskIds.includes(task.rawId) ? "wait" : "grabbing",
                      },
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: "0 8px 20px rgba(83, 96, 135, 0.14)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Checkbox
                          size="sm"
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => onToggleTask(task.rawId)}
                          slotProps={{ input: { "aria-label": `Select task ${task.id}` } }}
                        />
                        <Typography level="body-xs" sx={{ color: "#3155ff", fontWeight: 700, textWrapMode: "nowrap" }}>
                          {task.id}
                        </Typography>
                        <Tooltip title={copiedTaskId === task.id ? "Copied!" : "Copy task ID"}>
                          <IconButton
                            size="sm"
                            variant="plain"
                            aria-label={`Copy task ID ${task.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onCopyTaskId(task.id);
                            }}
                            sx={{ ml: "auto", minWidth: 26, minHeight: 26, color: "#60708e" }}
                          >
                            <ContentCopyRounded sx={{ fontSize: "0.95rem" }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Typography level="title-sm" sx={{ color: "#2f3b55", fontWeight: 700 }}>
                        <OverflowTooltip title={task.title} maxLines={2}>
                          {task.title}
                        </OverflowTooltip>
                      </Typography>

                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip
                          size="sm"
                          variant="soft"
                          sx={{ borderRadius: "999px", fontWeight: 700, ...priorityStyles[task.priority] }}
                        >
                          {task.priority}
                        </Chip>
                        {task.dueDate ? (
                          <Typography level="body-xs" sx={{ color: "#697795" }}>
                            Due {formatDateLabel(task.dueDate)}
                          </Typography>
                        ) : null}
                      </Stack>

                      <Typography level="body-xs" sx={{ color: "#697795" }}>
                        {task.assignedTo === "-" ? "Unassigned" : task.assignedTo}
                      </Typography>
                      {savingTaskIds.includes(task.rawId) ? (
                        <Typography level="body-xs" sx={{ color: "#3155ff", fontWeight: 700 }}>
                          Updating status...
                        </Typography>
                      ) : null}
                    </Stack>
                  </Sheet>
                );
              })}

              {columnTasks.length === 0 ? (
                <Typography
                  level="body-sm"
                  sx={{ py: 3, textAlign: "center", color: "#98a3bd" }}
                >
                  No tasks
                </Typography>
              ) : null}
            </Stack>
          </Sheet>
        );
      })}
    </Box>
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
  const [taskView, setTaskView] = useState(initialTaskViewState.view);
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
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState(initialBulkEditValues);
  const [bulkEditedFields, setBulkEditedFields] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [hoveredCellKey, setHoveredCellKey] = useState("");
  const [editingDueDateTaskId, setEditingDueDateTaskId] = useState(null);
  const [hoveredTaskRowId, setHoveredTaskRowId] = useState(null);
  const [editingTitleTaskId, setEditingTitleTaskId] = useState(null);
  const [copiedTaskId, setCopiedTaskId] = useState("");
  const [draggedRowTaskId, setDraggedRowTaskId] = useState(null);
  const [rowDropTarget, setRowDropTarget] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [isCustomFieldFormOpen, setIsCustomFieldFormOpen] = useState(false);
  const [editingCustomFieldId, setEditingCustomFieldId] = useState(null);
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [newCustomFieldType, setNewCustomFieldType] = useState("text");
  const [newCustomFieldOptionsText, setNewCustomFieldOptionsText] = useState("");
  const [newCustomFieldRequired, setNewCustomFieldRequired] = useState(true);
  const [isSavingCustomField, setIsSavingCustomField] = useState(false);
  const [deletingCustomFieldId, setDeletingCustomFieldId] = useState(null);
  const [savingColumnKey, setSavingColumnKey] = useState(null);
  const customFieldColumns = useMemo(
    () =>
      customFields.map((field) => ({
        key: buildCustomFieldColumnKey(field.id),
        label: field.label,
        style: { width: "160px", minWidth: "160px" },
        isCustomField: true,
        fieldType: field.fieldType,
        options: field.options,
      })),
    [customFields]
  );
  const allTaskColumns = useMemo(
    () => [...sortableTaskColumns, ...customFieldColumns],
    [customFieldColumns]
  );
  const manageableTaskColumnKeys = useMemo(
    () =>
      allTaskColumns
        .map((column) => column.key)
        .filter((key) => !pinnedTaskColumnKeys.includes(key)),
    [allTaskColumns]
  );
  const [taskColumnSettings, setTaskColumnSettings] = useState(() =>
    normalizeTaskColumnSettings(project?.taskListColumns, manageableTaskColumnKeys)
  );
  const [hasLoadedCustomFieldsOnce, setHasLoadedCustomFieldsOnce] = useState(false);
  const [isManageColumnsModalOpen, setIsManageColumnsModalOpen] = useState(false);
  const [draggedColumnKey, setDraggedColumnKey] = useState(null);
  const [columnDropTarget, setColumnDropTarget] = useState(null);
  const importFileInputRef = useRef(null);
  const copiedTaskIdTimeoutRef = useRef(null);
  const hasMountedTaskViewRef = useRef(false);
  // Custom fields load asynchronously, so the very first order-preserving
  // read of project.taskListColumns has to wait for them — otherwise it
  // would only ever see the 5 built-in keys and place every custom field
  // at the end instead of wherever it was actually saved.
  const hasNormalizedTaskColumnSettingsRef = useRef(false);
  // The saved drag order is what the list falls back to when no column sort is
  // applied, so manual reordering is only meaningful (and only offered) then.
  const isManualOrderActive = sortRules.length === 0;
  // The first column carries the drag handle alongside the checkbox, so the
  // sticky offsets of the two columns pinned after it shift with it.
  const selectColumnWidth = isManualOrderActive ? 78 : 48;
  const titleColumnOffset = selectColumnWidth + 102;
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
  const workspaceMembershipRole = String(workspace?.membershipRole || "")
    .trim()
    .toLowerCase();
  const isWorkspaceOwnerOrAdmin =
    workspaceMembershipRole === "owner" || workspaceMembershipRole === "admin";
  const isProjectOwner =
    String(project?.membershipRole || "")
      .trim()
      .toLowerCase() === "owner";
  const canManageTaskColumns = isWorkspaceOwnerOrAdmin || isProjectOwner;

  const orderedVisibleTaskColumns = useMemo(() => {
    const pinnedColumns = allTaskColumns.filter((column) =>
      pinnedTaskColumnKeys.includes(column.key)
    );
    const visibleManageableColumns = taskColumnSettings
      .filter((setting) => setting.visible)
      .map((setting) => allTaskColumns.find((column) => column.key === setting.key))
      .filter(Boolean);

    return [...pinnedColumns, ...visibleManageableColumns];
  }, [taskColumnSettings, allTaskColumns]);
  const taskTableColumnCount = orderedVisibleTaskColumns.length + 2;

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
  const visibleTaskIds = tasks.map((task) => task.rawId);
  const selectedVisibleTaskCount = visibleTaskIds.filter((taskId) =>
    selectedTaskIds.includes(taskId)
  ).length;
  const allVisibleTasksSelected =
    visibleTaskIds.length > 0 && selectedVisibleTaskCount === visibleTaskIds.length;
  const someVisibleTasksSelected =
    selectedVisibleTaskCount > 0 && !allVisibleTasksSelected;
  const hasBulkEditChanges = bulkEditedFields.some(
    (field) => String(bulkEditValues[field] ?? "").trim() !== ""
  );

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
    if (!hasNormalizedTaskColumnSettingsRef.current) {
      // Custom field keys aren't known yet on the very first render, so
      // wait until they've loaded at least once before doing the one
      // order-preserving read of the saved project.taskListColumns —
      // otherwise custom field columns would always land at the end
      // instead of wherever they were actually saved/reordered to.
      if (!hasLoadedCustomFieldsOnce) {
        return;
      }

      hasNormalizedTaskColumnSettingsRef.current = true;
      setTaskColumnSettings(
        normalizeTaskColumnSettings(project?.taskListColumns, manageableTaskColumnKeys)
      );
      return;
    }

    // After that first normalize, only merge in newly added/removed custom
    // field keys — never re-derive from project?.taskListColumns again, so
    // a reorder or toggle saved moments ago isn't clobbered by this effect
    // re-running for an unrelated reason (another field added/removed).
    setTaskColumnSettings((current) =>
      reconcileTaskColumnSettings(current, manageableTaskColumnKeys)
    );
  }, [hasLoadedCustomFieldsOnce, manageableTaskColumnKeys, project?.taskListColumns]);

  useEffect(() => {
    const loadCustomFields = async () => {
      if (!authSession?.token || !project?.id) {
        setCustomFields([]);
        hasNormalizedTaskColumnSettingsRef.current = false;
        setHasLoadedCustomFieldsOnce(false);
        return;
      }

      try {
        const result = await fetchProjectCustomFields(project.id, authSession.token);
        setCustomFields(Array.isArray(result?.customFields) ? result.customFields : []);
      } catch {
        setCustomFields([]);
      } finally {
        setHasLoadedCustomFieldsOnce(true);
      }
    };

    hasNormalizedTaskColumnSettingsRef.current = false;
    setHasLoadedCustomFieldsOnce(false);
    void loadCustomFields();
  }, [authSession?.token, project?.id]);

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

      if (taskView === "kanban") {
        nextSearchParams.set("view", "kanban");
        nextSearchParams.delete("page");
        nextSearchParams.delete("limit");
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
    taskView,
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
        const filters = {
          projectId: project.id,
          workspaceId: workspace?.id,
          search: debouncedSearchValue,
          ...debouncedColumnFilters,
          sort: sortRules.map(({ field, order }) => `${field}:${order}`).join(","),
        };

        if (taskView === "kanban") {
          const allTasks = await fetchAllTasks(authSession.token, filters);
          const mappedTasks = allTasks.map((task) => mapApiTaskToTableRow(task));

          setTasks(mappedTasks);
          setPagination({
            page: 1,
            limit: Math.max(1, mappedTasks.length),
            total: mappedTasks.length,
            totalPages: 1,
          });
          return;
        }

        const result = await fetchTasks(authSession.token, {
          ...filters,
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
    taskView,
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

  const handleClearSorting = () => {
    setSortRules([]);
    setCurrentPage(1);
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
      customFieldValues: draft.customFieldValues ?? task.rawTask?.customFieldValues ?? {},
    };

    const hasChanges =
      trimmedTitle !== String(task.rawTask?.title || "") ||
      nextPayload.status !== String(task.rawTask?.status || "todo") ||
      nextPayload.priority !== String(task.rawTask?.priority || "medium") ||
      String(nextPayload.dueDate || "") !== String(task.rawTask?.dueDate || "") ||
      String(nextPayload.assignedTo || "") !== String(task.rawTask?.assignedTo || "") ||
      String(nextPayload.assignedBy || "") !== String(task.rawTask?.assignedBy || "") ||
      JSON.stringify(normalizedTags) !==
      JSON.stringify(Array.isArray(task.rawTask?.tags) ? task.rawTask.tags : []) ||
      JSON.stringify(nextPayload.customFieldValues) !==
      JSON.stringify(task.rawTask?.customFieldValues || {});

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
    const task = tasks.find((currentTask) => currentTask.rawId === taskId);
    const baseDraft = taskDrafts[taskId] || (task ? buildEditableTaskValues(task) : {});
    const nextDraft = {
      ...baseDraft,
      [field]: value,
    };

    setTaskDrafts((currentDrafts) => ({
      ...currentDrafts,
      [taskId]: {
        ...(currentDrafts[taskId] || baseDraft),
        [field]: value,
      },
    }));

    if (options.saveImmediately) {
      void flushTaskAutosave(taskId, nextDraft);
    }
  };

  const handleInlineTaskBlur = (taskId) => {
    if (editingTitleTaskId === taskId) {
      setEditingTitleTaskId(null);
    }

    void flushTaskAutosave(taskId);
  };

  const closeInlineDueDateEditor = (taskId) => {
    setEditingDueDateTaskId(null);
    setHoveredCellKey((currentKey) =>
      currentKey === buildHoveredCellKey(taskId, "dueDate") ? "" : currentKey
    );
  };

  const handleInlineDueDateChange = (taskId, value) => {
    handleInlineTaskChange(taskId, "dueDate", value, { saveImmediately: true });
    closeInlineDueDateEditor(taskId);
  };

  const handleInlineCellMouseLeave = (taskId, field) => {
    if (field === "dueDate" && editingDueDateTaskId === taskId) {
      return;
    }

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

  const handleKanbanTaskMove = async (task, nextStatus) => {
    const currentStatus = String(task?.rawTask?.status || "").toLowerCase();

    if (
      !task?.rawId ||
      !authSession?.token ||
      currentStatus === nextStatus ||
      savingTaskIds.includes(task.rawId)
    ) {
      return;
    }

    const optimisticTask = {
      ...task,
      status: toTitleCase(nextStatus),
      rawTask: {
        ...task.rawTask,
        status: nextStatus,
      },
    };

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.rawId === task.rawId ? optimisticTask : currentTask
      )
    );
    setSavingTaskIds((currentIds) => [...currentIds, task.rawId]);

    try {
      const result = await updateTask(
        task.rawId,
        {
          title: task.rawTask?.title || task.title,
          description: task.rawTask?.description || "",
          status: nextStatus,
          priority: task.rawTask?.priority || "medium",
          taskType: task.rawTask?.taskType || "feature",
          parentTaskId: task.rawTask?.parentTaskId ?? null,
          assignedBy: task.rawTask?.assignedBy ?? null,
          assignedTo: task.rawTask?.assignedTo ?? null,
          startDate: task.rawTask?.startDate ?? null,
          dueDate: task.rawTask?.dueDate ?? null,
          completedAt: task.rawTask?.completedAt ?? null,
          tags: Array.isArray(task.rawTask?.tags) ? task.rawTask.tags : [],
          customFieldValues: task.rawTask?.customFieldValues || {},
        },
        authSession.token
      );
      const updatedTask = result?.task;

      if (updatedTask) {
        const mappedTask = mapApiTaskToTableRow(updatedTask);

        setTasks((currentTasks) =>
          currentTasks.map((currentTask) =>
            currentTask.rawId === task.rawId ? mappedTask : currentTask
          )
        );
        setTaskDrafts((currentDrafts) => ({
          ...currentDrafts,
          [task.rawId]: buildEditableTaskValues(mappedTask),
        }));
      }
    } catch (error) {
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.rawId === task.rawId ? task : currentTask
        )
      );
      await showErrorAlert(
        "Unable to move task",
        error.message || "The task status could not be updated."
      );
    } finally {
      setSavingTaskIds((currentIds) => currentIds.filter((taskId) => taskId !== task.rawId));
    }
  };

  // Saves a drop by naming the two tasks it landed between. Sending neighbour
  // ids rather than a row index keeps the server correct while the list is
  // paginated or filtered, and lets it reject a drop computed from a list
  // someone else has already reordered.
  const handleTaskReorder = async ({ taskId, nextTasks, nextStatus = null }) => {
    if (!authSession?.token || savingTaskIds.includes(taskId)) {
      return;
    }

    const insertIndex = nextTasks.findIndex((task) => task.rawId === taskId);

    if (insertIndex < 0) {
      return;
    }

    const previousTasks = tasks;
    const beforeTaskId = nextTasks[insertIndex - 1]?.rawId ?? null;
    const afterTaskId = nextTasks[insertIndex + 1]?.rawId ?? null;

    setTasks(nextTasks);
    setSavingTaskIds((currentIds) => [...currentIds, taskId]);

    try {
      const result = await reorderTask(
        taskId,
        {
          beforeTaskId,
          afterTaskId,
          ...(nextStatus ? { status: nextStatus } : {}),
        },
        authSession.token
      );
      const updatedTask = result?.task;

      if (updatedTask) {
        const mappedTask = mapApiTaskToTableRow(updatedTask);

        setTasks((currentTasks) =>
          currentTasks.map((currentTask) =>
            currentTask.rawId === taskId ? mappedTask : currentTask
          )
        );
        setTaskDrafts((currentDrafts) => ({
          ...currentDrafts,
          [taskId]: buildEditableTaskValues(mappedTask),
        }));
      }
    } catch (error) {
      setTasks(previousTasks);
      await showErrorAlert(
        "Unable to reorder tasks",
        error.message || "The task order could not be saved."
      );
    } finally {
      setSavingTaskIds((currentIds) => currentIds.filter((id) => id !== taskId));
    }
  };

  const handleTaskDropBeside = async (taskId, targetTaskId, placeAfter) => {
    const nextTasks = moveTaskBeside(tasks, taskId, targetTaskId, placeAfter);

    if (!nextTasks) {
      return;
    }

    await handleTaskReorder({ taskId, nextTasks });
  };

  // A Kanban card dropped onto another card both re-ranks it and, when the
  // cards live in different columns, moves it across statuses in one request.
  const handleKanbanCardDrop = async (taskId, targetTask, placeAfter) => {
    const nextTasks = moveTaskBeside(tasks, taskId, targetTask?.rawId, placeAfter);

    if (!nextTasks) {
      return;
    }

    const targetStatus = String(targetTask?.rawTask?.status || "").toLowerCase();
    const movedTask = nextTasks.find((task) => task.rawId === taskId);
    const currentStatus = String(movedTask?.rawTask?.status || "").toLowerCase();
    const nextStatus = targetStatus && targetStatus !== currentStatus ? targetStatus : null;

    await handleTaskReorder({
      taskId,
      nextStatus,
      nextTasks: nextStatus
        ? nextTasks.map((task) =>
          task.rawId === taskId
            ? {
              ...task,
              status: toTitleCase(nextStatus),
              rawTask: { ...task.rawTask, status: nextStatus },
            }
            : task
        )
        : nextTasks,
    });
  };

  const handleCopyTaskId = async (taskId) => {
    try {
      await copyTextToClipboard(taskId);
      setCopiedTaskId(taskId);

      if (copiedTaskIdTimeoutRef.current) {
        window.clearTimeout(copiedTaskIdTimeoutRef.current);
      }

      copiedTaskIdTimeoutRef.current = window.setTimeout(() => {
        setCopiedTaskId("");
        copiedTaskIdTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      await showErrorAlert(
        "Unable to copy task ID",
        error.message || "Clipboard access is unavailable."
      );
    }
  };

  useEffect(() => () => {
    if (copiedTaskIdTimeoutRef.current) {
      window.clearTimeout(copiedTaskIdTimeoutRef.current);
    }
  }, []);

  const handleToggleTaskSelection = (taskId) => {
    setSelectedTaskIds((currentIds) =>
      currentIds.includes(taskId)
        ? currentIds.filter((currentId) => currentId !== taskId)
        : [...currentIds, taskId]
    );
  };

  const handleToggleVisibleTasks = () => {
    setSelectedTaskIds((currentIds) => {
      if (allVisibleTasksSelected) {
        return currentIds.filter((taskId) => !visibleTaskIds.includes(taskId));
      }

      return Array.from(new Set([...currentIds, ...visibleTaskIds]));
    });
  };

  const handleBulkUpdate = async (updates, successLabel) => {
    if (!authSession?.token || !project?.id || selectedTaskIds.length === 0 || isBulkUpdating) {
      return false;
    }

    const taskIds = [...selectedTaskIds];
    setIsBulkUpdating(true);

    try {
      const result = await bulkUpdateTasks(
        {
          projectId: Number(project.id),
          taskIds,
          updates,
        },
        authSession.token
      );

      setSelectedTaskIds([]);
      setReloadTasksKey((currentValue) => currentValue + 1);

      await showSuccessAlert(
        "Tasks updated",
        result?.message ||
          `${taskIds.length} ${taskIds.length === 1 ? "task was" : "tasks were"} ${successLabel}.`
      );
      return true;
    } catch (error) {
      await showErrorAlert(
        "Unable to update selected tasks",
        error.message || "Something went wrong while updating the selected tasks."
      );
      return false;
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkEditValueChange = (field, value) => {
    setBulkEditValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setBulkEditedFields((currentFields) =>
      currentFields.includes(field) ? currentFields : [...currentFields, field]
    );
  };

  const handleApplyBulkEdit = async () => {
    const updates = Object.entries(bulkEditValues).reduce((nextUpdates, [field, value]) => {
      if (!bulkEditedFields.includes(field)) {
        return nextUpdates;
      }

      const normalizedStringValue = String(value ?? "").trim();

      if (!normalizedStringValue) {
        return nextUpdates;
      }

      if (["assignedTo", "assignedBy", "parentTaskId"].includes(field)) {
        nextUpdates[field] = value === "__clear__" ? null : Number(value);
      } else if (field === "tags") {
        nextUpdates[field] = normalizedStringValue
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      } else {
        nextUpdates[field] = normalizedStringValue;
      }

      return nextUpdates;
    }, {});

    if (Object.keys(updates).length === 0) {
      return;
    }

    const updated = await handleBulkUpdate(updates, "updated successfully");

    if (!updated) {
      return;
    }

    setBulkEditValues(initialBulkEditValues);
    setBulkEditedFields([]);
    setIsBulkEditModalOpen(false);
  };

  const handleBulkDelete = async () => {
    if (!authSession?.token || selectedTaskIds.length === 0 || isBulkDeleting) {
      return;
    }

    const taskIds = [...selectedTaskIds];
    const confirmation = await showConfirmAlert(
      `Delete ${taskIds.length} selected ${taskIds.length === 1 ? "task" : "tasks"}?`,
      "This action cannot be undone.",
      {
        confirmButtonText: "Delete Selected",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsBulkDeleting(true);

    try {
      const results = await Promise.allSettled(
        taskIds.map((taskId) => deleteTask(taskId, authSession.token))
      );
      const failedTaskIds = taskIds.filter((_, index) => results[index].status === "rejected");
      const deletedCount = taskIds.length - failedTaskIds.length;

      setSelectedTaskIds(failedTaskIds);
      setReloadTasksKey((currentValue) => currentValue + 1);

      if (failedTaskIds.length > 0) {
        await showErrorAlert(
          "Some tasks could not be deleted",
          `${deletedCount} deleted and ${failedTaskIds.length} failed. Failed tasks remain selected.`
        );
        return;
      }

      await showSuccessAlert(
        "Tasks deleted",
        `${deletedCount} ${deletedCount === 1 ? "task was" : "tasks were"} deleted successfully.`
      );
    } finally {
      setIsBulkDeleting(false);
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
      setSelectedTaskIds((currentIds) =>
        currentIds.filter((taskId) => taskId !== task.rawId)
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

  const resetCustomFieldForm = () => {
    setIsCustomFieldFormOpen(false);
    setEditingCustomFieldId(null);
    setNewCustomFieldLabel("");
    setNewCustomFieldType("text");
    setNewCustomFieldOptionsText("");
    setNewCustomFieldRequired(true);
  };

  const handleOpenManageColumnsModal = () => {
    resetCustomFieldForm();
    setIsManageColumnsModalOpen(true);
  };

  const handleCloseManageColumnsModal = () => {
    setIsManageColumnsModalOpen(false);
  };

  const handleOpenAddCustomFieldForm = () => {
    setEditingCustomFieldId(null);
    setNewCustomFieldLabel("");
    setNewCustomFieldType("text");
    setNewCustomFieldOptionsText("");
    setNewCustomFieldRequired(true);
    setIsCustomFieldFormOpen(true);
  };

  // Editing renders inline under the field's own row, not in the "Add
  // column" section, so it only needs the editing id set, not the add form.
  const handleOpenEditCustomFieldForm = (field) => {
    setIsCustomFieldFormOpen(false);
    setEditingCustomFieldId(field.id);
    setNewCustomFieldLabel(field.label);
    setNewCustomFieldType(field.fieldType);
    setNewCustomFieldOptionsText(Array.isArray(field.options) ? field.options.join(", ") : "");
  };

  const handleSaveCustomField = async () => {
    if (!authSession?.token || !project?.id) {
      return;
    }

    const label = newCustomFieldLabel.trim();

    if (!label) {
      await showErrorAlert("Field name required", "Please give the custom field a name.");
      return;
    }

    const payload = { label, fieldType: newCustomFieldType };

    if (newCustomFieldType === "select") {
      const options = newCustomFieldOptionsText
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);

      if (options.length === 0) {
        await showErrorAlert(
          "Options required",
          "Please provide at least one option, separated by commas."
        );
        return;
      }

      payload.options = options;
    }

    setIsSavingCustomField(true);

    try {
      if (editingCustomFieldId) {
        const result = await updateProjectCustomField(
          project.id,
          editingCustomFieldId,
          payload,
          authSession.token
        );
        const updatedField = result?.customField;

        if (updatedField) {
          setCustomFields((currentFields) =>
            currentFields.map((field) => (field.id === editingCustomFieldId ? updatedField : field))
          );
        }

        resetCustomFieldForm();
        await showSuccessAlert(
          "Column updated",
          result?.message || "The custom field has been updated successfully."
        );
      } else {
        const result = await createProjectCustomField(project.id, payload, authSession.token);
        const createdField = result?.customField;

        if (createdField) {
          setCustomFields((currentFields) => [...currentFields, createdField]);

          const columnKey = buildCustomFieldColumnKey(createdField.id);
          const nextSettings = [
            ...taskColumnSettings,
            { key: columnKey, visible: newCustomFieldRequired },
          ];

          setTaskColumnSettings(nextSettings);

          // A new field defaults to visible with no saved entry at all, so a
          // save call is only needed when the user opts out of that default.
          if (!newCustomFieldRequired) {
            await updateProjectTaskColumns(project.id, { columns: nextSettings }, authSession.token);
          }
        }

        resetCustomFieldForm();
        await showSuccessAlert(
          "Column added",
          result?.message || "The custom field has been added successfully."
        );
      }
    } catch (error) {
      await showErrorAlert(
        editingCustomFieldId ? "Unable to update custom field" : "Unable to add custom field",
        error.message || "Something went wrong while saving the custom field."
      );
    } finally {
      setIsSavingCustomField(false);
    }
  };

  const handleDeleteCustomField = async (fieldId) => {
    if (!authSession?.token || !project?.id) {
      return;
    }

    const confirmation = await showConfirmAlert(
      "Delete custom field?",
      "This removes the field and its values from every task. This cannot be undone.",
      {
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingCustomFieldId(fieldId);

    try {
      await deleteProjectCustomField(project.id, fieldId, authSession.token);
      const columnKey = buildCustomFieldColumnKey(fieldId);

      setCustomFields((currentFields) => currentFields.filter((field) => field.id !== fieldId));
      setTaskColumnSettings((currentSettings) =>
        currentSettings.filter((column) => column.key !== columnKey)
      );
      await showSuccessAlert(
        "Column removed",
        "The custom field has been deleted successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to delete custom field",
        error.message || "Something went wrong while deleting the custom field."
      );
    } finally {
      setDeletingCustomFieldId(null);
    }
  };

  const persistTaskColumnSettings = async (
    nextSettings,
    previousSettings,
    errorTitle,
    successTitle,
    successMessage
  ) => {
    setTaskColumnSettings(nextSettings);

    try {
      await updateProjectTaskColumns(project.id, { columns: nextSettings }, authSession.token);
      await showSuccessAlert(successTitle, successMessage);
    } catch (error) {
      setTaskColumnSettings(previousSettings);
      await showErrorAlert(errorTitle, error.message || "Something went wrong while saving.");
    }
  };

  const handleToggleColumnRequired = async (columnKey, nextVisible) => {
    if (!authSession?.token || !project?.id) {
      return;
    }

    const previousSettings = taskColumnSettings;
    const nextSettings = previousSettings.some((column) => column.key === columnKey)
      ? previousSettings.map((column) =>
          column.key === columnKey ? { ...column, visible: nextVisible } : column
        )
      : [...previousSettings, { key: columnKey, visible: nextVisible }];

    if (!nextSettings.some((column) => column.visible)) {
      await showErrorAlert(
        "At least one column required",
        "Please keep at least one column visible."
      );
      return;
    }

    setSavingColumnKey(columnKey);

    try {
      await persistTaskColumnSettings(
        nextSettings,
        previousSettings,
        "Unable to update column",
        "Column updated",
        nextVisible ? "This column is now visible on the task list." : "This column is now hidden from the task list."
      );
    } finally {
      setSavingColumnKey(null);
    }
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnKey(null);
    setColumnDropTarget(null);
  };

  const handleColumnDrop = async (targetKey, placeAfter) => {
    const draggedKey = draggedColumnKey;

    handleColumnDragEnd();

    if (!draggedKey || draggedKey === targetKey || !authSession?.token || !project?.id) {
      return;
    }

    const previousSettings = taskColumnSettings;
    const draggedIndex = previousSettings.findIndex((column) => column.key === draggedKey);

    if (draggedIndex === -1) {
      return;
    }

    const reordered = [...previousSettings];
    const [draggedColumn] = reordered.splice(draggedIndex, 1);
    let targetIndex = reordered.findIndex((column) => column.key === targetKey);

    if (targetIndex === -1) {
      return;
    }

    if (placeAfter) {
      targetIndex += 1;
    }

    reordered.splice(targetIndex, 0, draggedColumn);

    await persistTaskColumnSettings(
      reordered,
      previousSettings,
      "Unable to reorder columns",
      "Columns reordered",
      "The task list column order has been updated successfully."
    );
  };

  const renderTaskColumnCell = (task, columnKey) => {
    switch (columnKey) {
      case "status":
        return (
          <td
            key="status"
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
        );
      case "priority":
        return (
          <td
            key="priority"
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
        );
      case "dueDate":
        return (
          <td
            key="dueDate"
            onMouseEnter={() => setHoveredCellKey(buildHoveredCellKey(task.rawId, "dueDate"))}
            onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, "dueDate")}
          >
            {hoveredCellKey === buildHoveredCellKey(task.rawId, "dueDate") ||
            editingDueDateTaskId === task.rawId ? (
              <Input
                size="sm"
                type="date"
                value={taskDrafts[task.rawId]?.dueDate ?? task.dueDate ?? ""}
                onFocus={() => setEditingDueDateTaskId(task.rawId)}
                onChange={(event) =>
                  handleInlineDueDateChange(task.rawId, event.target.value)
                }
                onBlur={() => {
                  closeInlineDueDateEditor(task.rawId);
                }}
                sx={{ "--Input-minHeight": "34px", fontSize: "0.82rem" }}
              />
            ) : (
              formatDateLabel(taskDrafts[task.rawId]?.dueDate ?? task.dueDate)
            )}
          </td>
        );
      case "assignedTo":
        return (
          <td
            key="assignedTo"
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
        );
      case "assignedBy":
        return (
          <td
            key="assignedBy"
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
        );
      default: {
        if (!isCustomFieldColumnKey(columnKey)) {
          return null;
        }

        const fieldId = parseCustomFieldIdFromColumnKey(columnKey);
        const fieldDef = customFields.find((field) => String(field.id) === fieldId);

        if (!fieldDef) {
          return null;
        }

        const draftValues =
          taskDrafts[task.rawId]?.customFieldValues ?? task.rawTask?.customFieldValues ?? {};
        const currentValue = draftValues[fieldId];
        const cellHoverKey = buildHoveredCellKey(task.rawId, columnKey);

        const commitValue = (nextValue, options = {}) => {
          const baseValues =
            taskDrafts[task.rawId]?.customFieldValues ?? task.rawTask?.customFieldValues ?? {};
          handleInlineTaskChange(
            task.rawId,
            "customFieldValues",
            { ...baseValues, [fieldId]: nextValue },
            options
          );
        };

        if (fieldDef.fieldType === "checkbox") {
          return (
            <td key={columnKey}>
              <Checkbox
                size="sm"
                checked={Boolean(currentValue)}
                onChange={(event) => commitValue(event.target.checked, { saveImmediately: true })}
              />
            </td>
          );
        }

        if (fieldDef.fieldType === "select") {
          return (
            <td
              key={columnKey}
              onMouseEnter={() => setHoveredCellKey(cellHoverKey)}
              onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, columnKey)}
              onBlurCapture={() => handleInlineTaskBlur(task.rawId)}
            >
              {hoveredCellKey === cellHoverKey ? (
                <Select
                  size="sm"
                  value={currentValue || ""}
                  onChange={(_, value) => commitValue(value || "", { saveImmediately: true })}
                  onClose={() => handleInlineTaskBlur(task.rawId)}
                  sx={{ minHeight: "34px", fontSize: "0.82rem" }}
                >
                  <Option value="">Not set</Option>
                  {(fieldDef.options || []).map((option) => (
                    <Option key={`inline-${columnKey}-${task.rawId}-${option}`} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              ) : (
                currentValue || "-"
              )}
            </td>
          );
        }

        const inputType =
          fieldDef.fieldType === "number" ? "number" : fieldDef.fieldType === "date" ? "date" : "text";

        return (
          <td
            key={columnKey}
            onMouseEnter={() => setHoveredCellKey(cellHoverKey)}
            onMouseLeave={() => handleInlineCellMouseLeave(task.rawId, columnKey)}
          >
            {hoveredCellKey === cellHoverKey ? (
              <Input
                size="sm"
                type={inputType}
                value={currentValue ?? ""}
                onChange={(event) =>
                  commitValue(
                    event.target.value,
                    inputType === "date" ? { saveImmediately: true } : {}
                  )
                }
                onBlur={() => handleInlineTaskBlur(task.rawId)}
                sx={{ "--Input-minHeight": "34px", fontSize: "0.82rem" }}
              />
            ) : inputType === "date" ? (
              formatDateLabel(currentValue)
            ) : (
              currentValue || "-"
            )}
          </td>
        );
      }
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  level="title-lg"
                  sx={{ fontWeight: 700, color: "var(--color-font-primary)", fontSize: "1.08rem" }}
                >
                  Tasks
                </Typography>
                {selectedTaskIds.length > 0 ? (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="primary"
                    role="status"
                    aria-live="polite"
                    sx={{ fontWeight: 700 }}
                  >
                    {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "task" : "tasks"} selected
                  </Chip>
                ) : null}
              </Stack>
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
              {isManualOrderActive ? null : (
                <Tooltip title="Column sorting overrides your saved drag order. Clear it to reorder tasks by hand again.">
                  <Chip
                    variant="soft"
                    onClick={handleClearSorting}
                    sx={{
                      borderRadius: "10px",
                      px: 1.25,
                      minHeight: "34px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      backgroundColor: "#fff4e8",
                      color: "#b45309",
                    }}
                  >
                    Custom order paused
                  </Chip>
                </Tooltip>
              )}
              <Stack
                direction="row"
                sx={{
                  p: 0.35,
                  border: "1px solid #dfe4f1",
                  borderRadius: "10px",
                  backgroundColor: "#f7f9fc",
                }}
              >
                <Tooltip title="List view">
                  <IconButton
                    size="sm"
                    variant={taskView === "list" ? "solid" : "plain"}
                    color={taskView === "list" ? "primary" : "neutral"}
                    aria-label="Show tasks in list view"
                    aria-pressed={taskView === "list"}
                    onClick={() => {
                      setTaskView("list");
                      setCurrentPage(1);
                    }}
                    sx={{ borderRadius: "7px" }}
                  >
                    <ViewListRounded />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Kanban board">
                  <IconButton
                    size="sm"
                    variant={taskView === "kanban" ? "solid" : "plain"}
                    color={taskView === "kanban" ? "primary" : "neutral"}
                    aria-label="Show tasks in Kanban board view"
                    aria-pressed={taskView === "kanban"}
                    onClick={() => {
                      setTaskView("kanban");
                      setCurrentPage(1);
                    }}
                    sx={{ borderRadius: "7px" }}
                  >
                    <ViewKanbanRounded />
                  </IconButton>
                </Tooltip>
              </Stack>
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
                  {canManageTaskColumns ? (
                    <MenuItem
                      onClick={handleOpenManageColumnsModal}
                      sx={{ gap: 1, borderRadius: "8px" }}
                    >
                      <ViewColumnIcon />
                      Manage Columns
                    </MenuItem>
                  ) : null}
                </Menu>
              </Dropdown>
            </Stack>
          </Stack>

          {selectedTaskIds.length > 0 ? (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              sx={{
                px: 1.75,
                py: 1.25,
                borderTop: "1px solid #e4e9f5",
                backgroundColor: "#f7f9ff",
              }}
            >
              <Typography level="body-sm" sx={{ color: "#3155ff", fontWeight: 700, mr: 0.5 }}>
                Bulk Actions
              </Typography>
              <Select
                size="sm"
                value={null}
                placeholder="Update Status"
                disabled={isBulkUpdating || isBulkDeleting}
                onChange={(_, value) => {
                  if (value) {
                    void handleBulkUpdate({ status: value }, `moved to ${toTitleCase(value)}`);
                  }
                }}
                sx={{ minWidth: 150 }}
              >
                {taskStatusFilterOptions.map((option) => (
                  <Option key={`bulk-status-${option.value}`} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="soft"
                color="danger"
                startDecorator={<DeleteIcon />}
                loading={isBulkDeleting}
                disabled={isBulkUpdating}
                onClick={() => {
                  void handleBulkDelete();
                }}
              >
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="outlined"
                startDecorator={<EditIcon />}
                disabled={isBulkUpdating || isBulkDeleting}
                onClick={() => {
                  setBulkEditValues(initialBulkEditValues);
                  setBulkEditedFields([]);
                  setIsBulkEditModalOpen(true);
                }}
              >
                More Updates
              </Button>
            </Stack>
          ) : null}

          <Modal
            open={isBulkEditModalOpen}
            onClose={() => {
              if (!isBulkUpdating) {
                setIsBulkEditModalOpen(false);
              }
            }}
          >
            <ModalDialog
              layout="center"
              sx={{
                width: "min(760px, calc(100vw - 32px))",
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
                sx={{ px: { xs: 2, sm: 2.5 }, py: 2, pr: 6, borderBottom: "1px solid #e4e9f5" }}
              >
                <EditIcon sx={{ color: "#3155ff" }} />
                <DialogTitle sx={{ p: 0, color: "#1f2a44" }}>
                  Update {selectedTaskIds.length} selected {selectedTaskIds.length === 1 ? "task" : "tasks"}
                </DialogTitle>
                <ModalClose disabled={isBulkUpdating} />
              </Stack>

              <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.25, overflow: "auto" }}>
                <Stack spacing={2}>
                  <Typography level="body-sm" sx={{ color: "#60708e" }}>
                    Enter values only for the fields you want to change. Empty fields will remain unchanged.
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.5,
                    }}
                  >
                    <FormControl sx={{ gridColumn: { sm: "1 / -1" } }}>
                      <FormLabel>Task name</FormLabel>
                      <Input
                        value={bulkEditValues.title}
                        onChange={(event) => handleBulkEditValueChange("title", event.target.value)}
                        placeholder="Leave empty to keep existing names"
                        slotProps={{ input: { maxLength: 500 } }}
                      />
                    </FormControl>
                    <FormControl sx={{ gridColumn: { sm: "1 / -1" } }}>
                      <FormLabel>Description</FormLabel>
                      <Input
                        value={bulkEditValues.description}
                        onChange={(event) => handleBulkEditValueChange("description", event.target.value)}
                        placeholder="Leave empty to keep existing descriptions"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={bulkEditValues.status || null}
                        placeholder="No change"
                        onChange={(_, value) => handleBulkEditValueChange("status", value || "")}
                      >
                        {taskStatusFilterOptions.map((option) => (
                          <Option key={`bulk-edit-status-${option.value}`} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={bulkEditValues.priority || null}
                        placeholder="No change"
                        onChange={(_, value) => handleBulkEditValueChange("priority", value || "")}
                      >
                        {taskPriorityFilterOptions.map((option) => (
                          <Option key={`bulk-edit-priority-${option.value}`} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Task type</FormLabel>
                      <Select
                        value={bulkEditValues.taskType || null}
                        placeholder="No change"
                        onChange={(_, value) => handleBulkEditValueChange("taskType", value || "")}
                      >
                        {taskTypeOptions.map((option) => (
                          <Option key={`bulk-edit-type-${option.value}`} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        value={bulkEditValues.assignedTo || null}
                        placeholder="No change"
                        onChange={(_, value) => handleBulkEditValueChange("assignedTo", value || "")}
                      >
                        <Option value="__clear__">Clear assignment</Option>
                        {assigneeOptions.map((option) => (
                          <Option key={`bulk-edit-assignee-${option.id}`} value={String(option.id)}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Assigned by</FormLabel>
                      <Select
                        value={bulkEditValues.assignedBy || null}
                        placeholder="No change"
                        onChange={(_, value) => handleBulkEditValueChange("assignedBy", value || "")}
                      >
                        <Option value="__clear__">Clear assignment</Option>
                        {assigneeOptions.map((option) => (
                          <Option key={`bulk-edit-assigner-${option.id}`} value={String(option.id)}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Parent task ID</FormLabel>
                      <Input
                        type="number"
                        min={1}
                        value={bulkEditValues.parentTaskId}
                        onChange={(event) => handleBulkEditValueChange("parentTaskId", event.target.value)}
                        placeholder="No change"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Start date</FormLabel>
                      <Input
                        type="date"
                        value={bulkEditValues.startDate}
                        onChange={(event) => handleBulkEditValueChange("startDate", event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Due date</FormLabel>
                      <Input
                        type="date"
                        value={bulkEditValues.dueDate}
                        onChange={(event) => handleBulkEditValueChange("dueDate", event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Completed date</FormLabel>
                      <Input
                        type="date"
                        value={bulkEditValues.completedAt}
                        onChange={(event) => handleBulkEditValueChange("completedAt", event.target.value)}
                      />
                    </FormControl>
                    <FormControl sx={{ gridColumn: { sm: "1 / -1" } }}>
                      <FormLabel>Tags</FormLabel>
                      <Input
                        value={bulkEditValues.tags}
                        onChange={(event) => handleBulkEditValueChange("tags", event.target.value)}
                        placeholder="Comma-separated tags; leave empty for no change"
                      />
                    </FormControl>
                  </Box>
                </Stack>
              </DialogContent>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="flex-end"
                sx={{ px: { xs: 2, sm: 2.5 }, py: 1.75, borderTop: "1px solid #e4e9f5" }}
              >
                <Button
                  variant="plain"
                  color="neutral"
                  disabled={isBulkUpdating}
                  onClick={() => setIsBulkEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  loading={isBulkUpdating}
                  disabled={!hasBulkEditChanges}
                  onClick={() => {
                    void handleApplyBulkEdit();
                  }}
                >
                  Update Selected
                </Button>
              </Stack>
            </ModalDialog>
          </Modal>

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

          {taskView === "kanban" ? (
            <Box
              sx={{
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                borderTop: "1px solid rgba(223, 228, 243, 0.9)",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(120, 130, 154, 0.65) transparent",
              }}
            >
              <TaskKanbanBoard
                tasks={tasks}
                isLoading={isLoadingTasks}
                isManualOrderActive={isManualOrderActive}
                copiedTaskId={copiedTaskId}
                savingTaskIds={savingTaskIds}
                selectedTaskIds={selectedTaskIds}
                onCopyTaskId={(taskId) => {
                  void handleCopyTaskId(taskId);
                }}
                onMoveTask={(task, status) => {
                  void handleKanbanTaskMove(task, status);
                }}
                onOpenTask={handleShowTask}
                onReorderTask={(taskId, targetTask, placeAfter) => {
                  void handleKanbanCardDrop(taskId, targetTask, placeAfter);
                }}
                onToggleTask={handleToggleTaskSelection}
              />
            </Box>
          ) : null}

          <Box
            sx={{
              display: taskView === "list" ? "block" : "none",
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
                  left: { md: `${selectColumnWidth}px` },
                  zIndex: { md: 3 },
                  backgroundColor: "#fff",
                },
                "& thead th:nth-of-type(3)": {
                  position: { xs: "static", md: "sticky" },
                  left: { md: `${titleColumnOffset}px` },
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
                  left: { md: `${selectColumnWidth}px` },
                  zIndex: { md: 2 },
                  backgroundColor: "#fff",
                },
                "& tbody td:nth-of-type(3)": {
                  position: { xs: "static", md: "sticky" },
                  left: { md: `${titleColumnOffset}px` },
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
                "& tbody tr:nth-of-type(even) td:nth-of-type(1), & tbody tr:nth-of-type(even) td:nth-of-type(2), & tbody tr:nth-of-type(even) td:nth-of-type(3)": {
                  backgroundColor: "#fcfdff",
                },
                "& tbody tr:hover td:nth-of-type(1), & tbody tr:hover td:nth-of-type(2), & tbody tr:hover td:nth-of-type(3)": {
                  backgroundColor: "#f7f9ff",
                },
                // Drawn on every cell rather than the row so the drop line runs
                // the full width even though the table collapses its borders.
                "& tbody tr[data-drop-edge='before'] td": {
                  boxShadow: "inset 0 2px 0 0 #3155ff",
                },
                "& tbody tr[data-drop-edge='after'] td": {
                  boxShadow: "inset 0 -2px 0 0 #3155ff",
                },
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      width: `${selectColumnWidth}px`,
                      minWidth: `${selectColumnWidth}px`,
                    }}
                  >
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      {isManualOrderActive ? (
                        <Tooltip title="Drag the handles to set your own task order">
                          <DragIndicatorRounded
                            sx={{ fontSize: "1.05rem", color: "#b3bcd2" }}
                          />
                        </Tooltip>
                      ) : null}
                      <Checkbox
                        size="sm"
                        checked={allVisibleTasksSelected}
                        indeterminate={someVisibleTasksSelected}
                        disabled={tasks.length === 0 || isLoadingTasks}
                        onChange={handleToggleVisibleTasks}
                        slotProps={{ input: { "aria-label": "Select all tasks on this page" } }}
                      />
                    </Stack>
                  </th>
                  {orderedVisibleTaskColumns.map((column) => {
                    const sortIndex = sortRules.findIndex((rule) => rule.field === column.key);
                    const activeSortRule = sortRules[sortIndex];
                    const isActiveSort = sortIndex >= 0;
                    const SortIcon = isActiveSort
                      ? activeSortRule.order === "asc"
                        ? ArrowUpwardRounded
                        : ArrowDownwardRounded
                      : UnfoldMoreRounded;

                    if (column.isCustomField) {
                      return (
                        <th key={column.key} style={column.style}>
                          <Typography
                            level="body-xs"
                            sx={{ fontWeight: 700, color: "inherit", whiteSpace: "nowrap" }}
                          >
                            {column.label}
                          </Typography>
                        </th>
                      );
                    }

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
                    <td colSpan={taskTableColumnCount}>
                      <Stack alignItems="center" spacing={0.75} sx={{ py: 5 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          Loading tasks...
                        </Typography>
                      </Stack>
                    </td>
                  </tr>
                ) : null}
                {!isLoadingTasks && tasks.map((task) => {
                  const isDraggedRow = draggedRowTaskId === task.rawId;
                  const isDropTarget =
                    rowDropTarget?.taskId === task.rawId && !isDraggedRow;
                  const dropEdge = isDropTarget
                    ? rowDropTarget.placeAfter
                      ? "after"
                      : "before"
                    : undefined;

                  return (
                  <tr
                    key={task.id}
                    onMouseEnter={() => setHoveredTaskRowId(task.rawId)}
                    onMouseLeave={() => setHoveredTaskRowId(null)}
                    onDragOver={(event) => {
                      if (!isManualOrderActive || draggedRowTaskId === null) {
                        return;
                      }

                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setRowDropTarget({
                        taskId: task.rawId,
                        placeAfter: shouldDropAfter(event, event.currentTarget),
                      });
                    }}
                    onDrop={(event) => {
                      if (!isManualOrderActive || draggedRowTaskId === null) {
                        return;
                      }

                      event.preventDefault();
                      const movedTaskId = Number(
                        event.dataTransfer.getData("text/plain") || draggedRowTaskId
                      );
                      const placeAfter = shouldDropAfter(event, event.currentTarget);

                      setDraggedRowTaskId(null);
                      setRowDropTarget(null);
                      void handleTaskDropBeside(movedTaskId, task.rawId, placeAfter);
                    }}
                    data-drop-edge={dropEdge}
                    style={{
                      opacity: isDraggedRow ? 0.45 : 1,
                    }}
                  >
                    <td>
                      <Stack direction="row" spacing={0.25} alignItems="center">
                        {isManualOrderActive ? (
                          <Tooltip title="Drag to reorder">
                            <Box
                              component="span"
                              draggable={!savingTaskIds.includes(task.rawId)}
                              aria-label={`Drag to reorder task ${task.id}`}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(task.rawId));

                                // Drag the whole row, not just the handle glyph.
                                const rowElement = event.currentTarget.closest("tr");

                                if (rowElement) {
                                  event.dataTransfer.setDragImage(rowElement, 24, 16);
                                }

                                setDraggedRowTaskId(task.rawId);
                              }}
                              onDragEnd={() => {
                                setDraggedRowTaskId(null);
                                setRowDropTarget(null);
                              }}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                color: "#b3bcd2",
                                cursor: savingTaskIds.includes(task.rawId) ? "wait" : "grab",
                                "&:active": {
                                  cursor: savingTaskIds.includes(task.rawId)
                                    ? "wait"
                                    : "grabbing",
                                },
                                "&:hover": { color: "#3155ff" },
                              }}
                            >
                              <DragIndicatorRounded sx={{ fontSize: "1.05rem" }} />
                            </Box>
                          </Tooltip>
                        ) : null}
                        <Checkbox
                          size="sm"
                          checked={selectedTaskIds.includes(task.rawId)}
                          onChange={() => handleToggleTaskSelection(task.rawId)}
                          slotProps={{ input: { "aria-label": `Select task ${task.id}` } }}
                        />
                      </Stack>
                    </td>
                    <td>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography sx={{ color: "#3155ff", fontWeight: 700, textWrapMode: "nowrap" }}>
                          {task.id}
                        </Typography>
                        <Tooltip title={copiedTaskId === task.id ? "Copied!" : "Copy task ID"}>
                          <IconButton
                            size="sm"
                            variant="plain"
                            aria-label={
                              copiedTaskId === task.id
                                ? `${task.id} copied`
                                : `Copy task ID ${task.id}`
                            }
                            onClick={() => {
                              void handleCopyTaskId(task.id);
                            }}
                            sx={{
                              minHeight: 26,
                              minWidth: 26,
                              p: 0.5,
                              color: "#3155ff",
                              opacity:
                                hoveredTaskRowId === task.rawId || copiedTaskId === task.id ? 1 : 0,
                              transition: "opacity 0.18s ease",
                              "&:focus-visible": {
                                opacity: 1,
                              },
                            }}
                          >
                            <ContentCopyRounded sx={{ fontSize: "1rem" }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
                    {orderedVisibleTaskColumns
                      .filter((column) => column.key !== "id" && column.key !== "title")
                      .map((column) => renderTaskColumnCell(task, column.key))}
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
                  );
                })}
                {!isLoadingTasks && tasks.length === 0 ? (
                  <tr>
                    <td colSpan={taskTableColumnCount}>
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
              display: taskView === "list" ? "flex" : "none",
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

      <Modal open={isManageColumnsModalOpen} onClose={handleCloseManageColumnsModal}>
        <ModalDialog
          layout="center"
          sx={{ width: "100%", maxWidth: 780, maxHeight: "85vh", borderRadius: "16px" }}
        >
          <ModalClose onClick={handleCloseManageColumnsModal} />
          <DialogTitle sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
            Manage task columns
          </DialogTitle>
          <DialogContent sx={{ overflowY: "auto" }}>
            <Typography level="body-sm" sx={{ color: "#60708e", mb: 2 }}>
              Drag to reorder, toggle Required to show or hide a column, or add a new custom
              column below. ID and Task Name always stay visible.
            </Typography>

            <Sheet
              variant="outlined"
              sx={{ borderRadius: "10px", overflow: "hidden", overflowX: "auto" }}
            >
              <Table borderAxis="xBetween" sx={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Column name</th>
                    <th style={{ width: "20%" }}>Column type</th>
                    <th style={{ width: "20%" }}>Required</th>
                    <th style={{ width: "20%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {taskColumnSettings.map((setting) => {
                    const columnDefinition = allTaskColumns.find(
                      (definition) => definition.key === setting.key
                    );

                    if (!columnDefinition) {
                      return null;
                    }

                    const isCustomField = Boolean(columnDefinition.isCustomField);
                    const isDraggedColumn = draggedColumnKey === setting.key;
                    const isDropTarget =
                      columnDropTarget?.key === setting.key && !isDraggedColumn;
                    const dropEdge = isDropTarget
                      ? columnDropTarget.placeAfter
                        ? "after"
                        : "before"
                      : undefined;
                    const fieldId = isCustomField
                      ? Number(parseCustomFieldIdFromColumnKey(setting.key))
                      : null;
                    const customField = isCustomField
                      ? customFields.find((field) => field.id === fieldId)
                      : null;

                    const isEditingThisField = isCustomField && editingCustomFieldId === fieldId;

                    return (
                      <Fragment key={setting.key}>
                      <tr
                        data-drop-edge={dropEdge}
                        onDragOver={(event) => {
                          if (!draggedColumnKey || isDraggedColumn) {
                            return;
                          }

                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setColumnDropTarget({
                            key: setting.key,
                            placeAfter: shouldDropAfter(event, event.currentTarget),
                          });
                        }}
                        onDrop={(event) => {
                          if (!draggedColumnKey) {
                            return;
                          }

                          event.preventDefault();
                          void handleColumnDrop(
                            setting.key,
                            shouldDropAfter(event, event.currentTarget)
                          );
                        }}
                        style={{
                          opacity: isDraggedColumn ? 0.45 : 1,
                          boxShadow:
                            dropEdge === "before"
                              ? "inset 0 2px 0 0 #3155ff"
                              : dropEdge === "after"
                                ? "inset 0 -2px 0 0 #3155ff"
                                : undefined,
                        }}
                      >
                        <td>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {canManageTaskColumns ? (
                              <Tooltip title="Drag to reorder">
                                <Box
                                  component="span"
                                  draggable
                                  aria-label={`Drag to reorder ${columnDefinition.label}`}
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", setting.key);
                                    setDraggedColumnKey(setting.key);
                                  }}
                                  onDragEnd={handleColumnDragEnd}
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    color: "#b3bcd2",
                                    cursor: "grab",
                                    "&:active": { cursor: "grabbing" },
                                    "&:hover": { color: "#3155ff" },
                                  }}
                                >
                                  <DragIndicatorRounded sx={{ fontSize: "1.1rem" }} />
                                </Box>
                              </Tooltip>
                            ) : null}
                            <Typography level="body-sm">{columnDefinition.label}</Typography>
                          </Stack>
                        </td>
                        <td>
                          {isCustomField
                            ? customFieldTypeOptions.find(
                                (option) => option.value === columnDefinition.fieldType
                              )?.label || columnDefinition.fieldType
                            : "Built-in"}
                        </td>
                        <td>
                          <Checkbox
                            size="sm"
                            checked={setting.visible}
                            disabled={!canManageTaskColumns || savingColumnKey === setting.key}
                            onChange={(event) =>
                              handleToggleColumnRequired(setting.key, event.target.checked)
                            }
                          />
                        </td>
                        <td>
                          {canManageTaskColumns ? (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title={setting.visible ? "Hide column" : "Unhide column"}>
                                <IconButton
                                  size="sm"
                                  variant="plain"
                                  color="neutral"
                                  disabled={savingColumnKey === setting.key}
                                  onClick={() =>
                                    handleToggleColumnRequired(setting.key, !setting.visible)
                                  }
                                  aria-label={
                                    setting.visible
                                      ? `Hide ${columnDefinition.label}`
                                      : `Unhide ${columnDefinition.label}`
                                  }
                                >
                                  {setting.visible ? (
                                    <EyeIcon sx={{ fontSize: "1.1rem" }} />
                                  ) : (
                                    <EyeOffIcon sx={{ fontSize: "1.1rem" }} />
                                  )}
                                </IconButton>
                              </Tooltip>
                              {isCustomField ? (
                                <>
                                  <Tooltip title="Edit column">
                                    <IconButton
                                      size="sm"
                                      variant="plain"
                                      color="neutral"
                                      onClick={() =>
                                        customField && handleOpenEditCustomFieldForm(customField)
                                      }
                                      aria-label={`Edit ${columnDefinition.label}`}
                                    >
                                      <EditIcon sx={{ fontSize: "1.1rem" }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remove column">
                                    <IconButton
                                      size="sm"
                                      variant="plain"
                                      color="danger"
                                      loading={deletingCustomFieldId === fieldId}
                                      onClick={() => handleDeleteCustomField(fieldId)}
                                      aria-label={`Remove ${columnDefinition.label}`}
                                    >
                                      <DeleteIcon sx={{ fontSize: "1.1rem" }} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              ) : null}
                            </Stack>
                          ) : null}
                        </td>
                      </tr>
                      {isEditingThisField ? (
                        <tr>
                          <td colSpan={4} style={{ backgroundColor: "#f7f9fc" }}>
                            <Stack spacing={1.25} sx={{ p: 1 }}>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <Input
                                  size="sm"
                                  placeholder="Column name"
                                  value={newCustomFieldLabel}
                                  onChange={(event) => setNewCustomFieldLabel(event.target.value)}
                                  sx={{ flex: 1 }}
                                  autoFocus
                                />
                                <Select
                                  size="sm"
                                  placeholder="Column type"
                                  value={newCustomFieldType}
                                  onChange={(_, value) => setNewCustomFieldType(value || "text")}
                                  sx={{ minWidth: 150 }}
                                >
                                  {customFieldTypeOptions.map((option) => (
                                    <Option key={option.value} value={option.value}>
                                      {option.label}
                                    </Option>
                                  ))}
                                </Select>
                              </Stack>
                              {newCustomFieldType === "select" ? (
                                <Input
                                  size="sm"
                                  placeholder="Options, separated by commas"
                                  value={newCustomFieldOptionsText}
                                  onChange={(event) =>
                                    setNewCustomFieldOptionsText(event.target.value)
                                  }
                                />
                              ) : null}
                              <Stack direction="row" spacing={1}>
                                <Button
                                  size="sm"
                                  loading={isSavingCustomField}
                                  onClick={() => {
                                    void handleSaveCustomField();
                                  }}
                                >
                                  Save column
                                </Button>
                                <Button
                                  size="sm"
                                  variant="plain"
                                  color="neutral"
                                  disabled={isSavingCustomField}
                                  onClick={resetCustomFieldForm}
                                >
                                  Cancel
                                </Button>
                              </Stack>
                            </Stack>
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </Table>
            </Sheet>

            {canManageTaskColumns ? (
              <Box sx={{ mt: 2 }}>
                {isCustomFieldFormOpen ? (
                  <Stack
                    spacing={1.25}
                    sx={{ p: 1.5, border: "1px dashed #d6dcec", borderRadius: "10px" }}
                  >
                    <Typography level="body-sm" sx={{ fontWeight: 700, color: "#3d4a68" }}>
                      Add column
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Input
                        size="sm"
                        placeholder="Column name"
                        value={newCustomFieldLabel}
                        onChange={(event) => setNewCustomFieldLabel(event.target.value)}
                        sx={{ flex: 1 }}
                        autoFocus
                      />
                      <Select
                        size="sm"
                        placeholder="Column type"
                        value={newCustomFieldType}
                        onChange={(_, value) => setNewCustomFieldType(value || "text")}
                        sx={{ minWidth: 150 }}
                      >
                        {customFieldTypeOptions.map((option) => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Stack>
                    {newCustomFieldType === "select" ? (
                      <Input
                        size="sm"
                        placeholder="Options, separated by commas"
                        value={newCustomFieldOptionsText}
                        onChange={(event) => setNewCustomFieldOptionsText(event.target.value)}
                      />
                    ) : null}
                    <Checkbox
                      size="sm"
                      label="Required"
                      checked={newCustomFieldRequired}
                      onChange={(event) => setNewCustomFieldRequired(event.target.checked)}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="sm"
                        loading={isSavingCustomField}
                        onClick={() => {
                          void handleSaveCustomField();
                        }}
                      >
                        Save column
                      </Button>
                      <Button
                        size="sm"
                        variant="plain"
                        color="neutral"
                        disabled={isSavingCustomField}
                        onClick={resetCustomFieldForm}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Button
                    variant="soft"
                    startDecorator={<PlusIcon sx={{ fontSize: "1.1rem" }} />}
                    onClick={handleOpenAddCustomFieldForm}
                  >
                    Add column
                  </Button>
                )}
              </Box>
            ) : null}
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
