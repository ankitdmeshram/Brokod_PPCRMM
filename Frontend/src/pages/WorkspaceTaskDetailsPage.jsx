import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import RichTextEditor from "../components/common/RichTextEditor";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import {
  DeleteIcon,
  EditIcon,
  EyeIcon,
  GridIcon,
  NotificationIcon,
  PlusIcon,
  TasksIcon,
} from "../components/workspace/WorkspaceIcons";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildTaskDetailsRoute,
  buildProjectSectionRoute,
  buildWorkspaceApplicationsRoute,
  buildWorkspaceProjectsRoute,
} from "../router/authRoutes";
import {
  showAccessDeniedAlert,
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../services/alert.service";
import { fetchProjectUsers, fetchProjectBySlug } from "../services/project.service";
import {
  createTask,
  createTaskComment,
  deleteTask,
  fetchAllTasks,
  fetchTaskBySlug,
  fetchTaskComments,
  updateTaskComment,
  updateTask,
} from "../services/task.service";
import { fetchAllWorkspaceUsers, fetchWorkspaces } from "../services/workspace.service";

const statusOptions = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const priorityOptions = [
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

const tagSuggestions = ["Planning", "Backend", "Frontend", "Bugfix", "Research", "Sprint"];

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

const normalizeDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
};

const buildTaskFormValues = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "todo",
  priority: task?.priority || "medium",
  taskType: task?.taskType || "feature",
  parentTaskId: task?.parentTaskId ? String(task.parentTaskId) : "",
  assignedBy: task?.assignedBy ? String(task.assignedBy) : "",
  assignedTo: task?.assignedTo ? String(task.assignedTo) : "",
  startDate: normalizeDateInputValue(task?.startDate),
  dueDate: normalizeDateInputValue(task?.dueDate),
  completedDate: normalizeDateInputValue(task?.completedAt),
  tags: Array.isArray(task?.tags) ? task.tags : [],
});

const buildUpdatePayload = (values) => ({
  title: String(values.title || "").trim(),
  description: String(values.description || "").trim(),
  status: values.status,
  priority: values.priority,
  taskType: values.taskType,
  parentTaskId: values.parentTaskId || null,
  assignedBy: values.assignedBy || null,
  assignedTo: values.assignedTo || null,
  startDate: values.startDate || null,
  dueDate: values.dueDate || null,
  completedAt: values.completedDate || null,
  tags: Array.isArray(values.tags) ? values.tags : [],
});

const buildSubtaskDraftValues = () => ({
  localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  assignedTo: "",
  status: "todo",
  dueDate: "",
});

const formatCommentTimestamp = (value) => {
  if (!value) {
    return "Just now";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Just now";
  }

  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildUserInitials = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

const getPlainTextFromHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const isCompletedStatus = (value) => String(value || "").trim().toLowerCase() === "done";
const getTodayDateOnly = () => new Date().toISOString().slice(0, 10);
const SUBTASK_AUTOSAVE_DELAY_MS = 400;
const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

const TaskHeaderSection = memo(function TaskHeaderSection({
  parentTaskTitle,
  parentTaskNavigateLabel,
  onOpenParentTask,
  title,
  description,
  onFieldChange,
}) {
  return (
    <Stack spacing={1}>
      {parentTaskTitle ? (
        <Button
          variant="plain"
          color="neutral"
          onClick={onOpenParentTask}
          sx={{
            alignSelf: "flex-start",
            px: 0,
            py: 0,
            minHeight: "auto",
            color: "#60708e",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "transparent",
              color: "#3155ff",
            },
          }}
        >
          {parentTaskNavigateLabel}
        </Button>
      ) : null}
      <Textarea
        value={title}
        onChange={(event) => onFieldChange("title", event.target.value)}
        variant="outlined"
        placeholder="Task title"
        aria-label="Task title"
        minRows={1}
        slotProps={{
          textarea: {
            maxLength: 500,
          },
        }}
        sx={{
          px: 0.5,
          py: 0.25,
          minHeight: "auto",
          borderRadius: "sm",
          backgroundColor: "transparent",
          borderColor: "transparent",
          boxShadow: "none",
          fontSize: "1.14rem",
          fontWeight: 700,
          color: "#23314d",
          "--Input-focusedThickness": "0px",
          "--Input-focusedHighlight": "transparent",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            borderColor: "var(--joy-palette-neutral-outlinedBorder)",
          },
          "&.Mui-focused": {
            backgroundColor: "var(--joy-palette-background-surface)",
            borderColor: "var(--joy-palette-primary-outlinedBorder)",
          },
          "& textarea": {
            p: 0,
            font: "inherit",
            color: "inherit",
            lineHeight: 1.4,
          },
        }}
      />
      <FormControl>
        <FormLabel>Description</FormLabel>
        <RichTextEditor
          value={description}
          onChange={(value) => onFieldChange("description", value)}
          minHeight={220}
        />
      </FormControl>
    </Stack>
  );
});

const TaskMetadataSection = memo(function TaskMetadataSection({
  status,
  priority,
  taskType,
  assignedBy,
  assignedTo,
  createdByName,
  startDate,
  dueDate,
  completedDate,
  tags,
  projectUserOptions,
  onFieldChange,
  onTagsChange,
}) {
  return (
    <>
      <Stack spacing={1}>
        <Typography level="title-sm" sx={{ fontWeight: 700, color: "#23314d" }}>
          Workflow
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Status</FormLabel>
            <Select value={status} onChange={(_, value) => onFieldChange("status", value || "")}>
              {statusOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Priority</FormLabel>
            <Select value={priority} onChange={(_, value) => onFieldChange("priority", value || "")}>
              {priorityOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Task type</FormLabel>
            <Select value={taskType} onChange={(_, value) => onFieldChange("taskType", value || "")}>
              {taskTypeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Typography level="title-sm" sx={{ fontWeight: 700, color: "#23314d" }}>
          Assignment
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Assigned by</FormLabel>
            <Select value={assignedBy} onChange={(_, value) => onFieldChange("assignedBy", value || "")}>
              {projectUserOptions.map((option) => (
                <Option key={option.id} value={String(option.id)}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Assigned to</FormLabel>
            <Select value={assignedTo} onChange={(_, value) => onFieldChange("assignedTo", value || "")}>
              {projectUserOptions.map((option) => (
                <Option key={option.id} value={String(option.id)}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Created by</FormLabel>
            <Input value={createdByName || "-"} readOnly />
          </FormControl>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Typography level="title-sm" sx={{ fontWeight: 700, color: "#23314d" }}>
          Dates And Tags
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Start date</FormLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => onFieldChange("startDate", event.target.value)}
            />
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Due date</FormLabel>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => onFieldChange("dueDate", event.target.value)}
            />
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Completed date</FormLabel>
            <Input
              type="date"
              value={completedDate}
              onChange={(event) => onFieldChange("completedDate", event.target.value)}
            />
          </FormControl>
        </Stack>
        <FormControl>
          <FormLabel>Tags</FormLabel>
          <Autocomplete
            multiple
            freeSolo
            options={tagSuggestions}
            value={tags}
            onChange={onTagsChange}
            placeholder="Add task tags"
          />
        </FormControl>
      </Stack>
    </>
  );
});

export default function WorkspaceTaskDetailsPage() {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceSlug = "", projectSlug = "", taskSlug = "" } = useParams();
  const routedWorkspace = location.state?.workspace || null;
  const routedProject = location.state?.project || null;
  const [workspace, setWorkspace] = useState(() => routedWorkspace);
  const [project, setProject] = useState(() => routedProject);
  const [task, setTask] = useState(null);
  const [projectUsers, setProjectUsers] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [subtaskDrafts, setSubtaskDrafts] = useState([]);
  const [creatingSubtaskIds, setCreatingSubtaskIds] = useState([]);
  const [deletingSubtaskIds, setDeletingSubtaskIds] = useState([]);
  const [updatingSubtaskIds, setUpdatingSubtaskIds] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentEntries, setCommentEntries] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [taskValues, setTaskValues] = useState(() => buildTaskFormValues(null));
  const [lastSavedValues, setLastSavedValues] = useState(() => buildTaskFormValues(null));
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isResolving, setIsResolving] = useState(true);
  const subtaskAutosaveTimeoutsRef = useRef({});
  const pendingSubtaskOverridesRef = useRef({});

  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const currentUserId = authSession?.user?.id ? Number(authSession.user.id) : null;
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const headerTitle = task?.title || project?.projectName || "";

  const sidebarItems = useMemo(
    () => [
      {
        key: "overview",
        icon: <GridIcon />,
        label: "Overview",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "overview"),
      },
      {
        key: "tasks",
        icon: <TasksIcon />,
        label: "Tasks",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "tasks"),
        active: true,
      },
      {
        key: "notifications",
        icon: <NotificationIcon />,
        label: "Notifications",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "notifications"),
      },
    ],
    [projectSlug, workspaceSlug]
  );

  const projectUserOptions = useMemo(
    () => {
      const projectAccess = String(project?.access || "").trim().toLowerCase();

      return projectAccess === "public"
        ? workspaceUsers.map(mapWorkspaceUserToOption)
        : projectUsers.map(mapProjectUserToOption);
    },
    [project?.access, projectUsers, workspaceUsers]
  );

  const subtasks = useMemo(
    () =>
      projectTasks
        .filter((projectTask) => Number(projectTask.parentTaskId) === Number(task?.id))
        .sort(
          (leftTask, rightTask) =>
            Number(leftTask.projectTaskNumber || leftTask.id) -
            Number(rightTask.projectTaskNumber || rightTask.id)
        ),
    [projectTasks, task?.id]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      JSON.stringify(buildUpdatePayload(taskValues)) !==
      JSON.stringify(buildUpdatePayload(lastSavedValues)),
    [lastSavedValues, taskValues]
  );
  const shouldBlockUnsavedChanges = hasUnsavedChanges && saveState !== "saving";

  const loadProjectTasks = async (projectId, workspaceId, token) => {
    if (!token || !projectId) {
      setProjectTasks([]);
      return;
    }

    try {
      const allTasks = await fetchAllTasks(token, {
        projectId,
        workspaceId,
      });

      setProjectTasks(allTasks);
    } catch {
      setProjectTasks([]);
    }
  };

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
          setTask(null);
          return;
        }

        setWorkspace(resolvedWorkspace);

        let resolvedProject =
          routedProject?.slug === projectSlug ? routedProject : project?.slug === projectSlug ? project : null;

        if (!resolvedProject && projectSlug) {
          const projectResult = await fetchProjectBySlug(projectSlug, authSession.token, {
            workspaceId: resolvedWorkspace.id,
          });
          resolvedProject = projectResult?.project || null;
        }

        if (
          !resolvedProject ||
          Number(resolvedProject.workspaceId) !== Number(resolvedWorkspace.id)
        ) {
          setProject(null);
          setTask(null);
          return;
        }

        setProject(resolvedProject);

        if (!taskSlug) {
          setTask(null);
          return;
        }

        setTask(null);
        setTaskValues(buildTaskFormValues(null));
        setLastSavedValues(buildTaskFormValues(null));
        setSaveState("idle");
        setSaveMessage("");

        const taskResult = await fetchTaskBySlug(taskSlug, authSession.token, {
          projectId: resolvedProject.id,
        });
        const resolvedTask = taskResult?.task || null;

        if (
          resolvedTask &&
          Number(resolvedTask.projectId) === Number(resolvedProject.id) &&
          Number(resolvedTask.workspaceId) === Number(resolvedWorkspace.id)
        ) {
          setTask(resolvedTask);
        } else {
          setTask(null);
        }
      } catch (error) {
        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          setWorkspace(null);
          setProject(null);
          setTask(null);
          return;
        }

        await showErrorAlert(
          "Unable to load task",
          error.message || "Something went wrong while loading the task."
        );
        setWorkspace(null);
        setProject(null);
        setTask(null);
      } finally {
        setIsResolving(false);
      }
    };

    void resolveContext();
  }, [
    authSession?.token,
    project,
    project?.id,
    project?.slug,
    projectSlug,
    routedProject,
    routedWorkspace,
    taskSlug,
    workspace,
    workspace?.id,
    workspace?.slug,
    workspaceSlug,
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
    void loadProjectTasks(project?.id, workspace?.id, authSession?.token);
  }, [authSession?.token, project?.id, workspace?.id]);

  useEffect(() => {
    if (task) {
      const nextValues = buildTaskFormValues(task);
      setTaskValues(nextValues);
      setLastSavedValues(nextValues);
      setSubtaskDrafts([]);
      setCommentDraft("");
      setCommentEntries([]);
      setEditingCommentId(null);
      setEditingCommentDraft("");
      setSaveState("idle");
      setSaveMessage("");
    }
  }, [task?.id]);

  useEffect(() => {
    const loadTaskComments = async () => {
      if (!authSession?.token || !task?.id) {
        setCommentEntries([]);
        setIsLoadingComments(false);
        return;
      }

      setIsLoadingComments(true);

      try {
        const result = await fetchTaskComments(task.id, authSession.token);
        setCommentEntries(Array.isArray(result?.comments) ? result.comments : []);
      } catch (error) {
        setCommentEntries([]);
        await showErrorAlert(
          "Unable to load comments",
          error.message || "Something went wrong while loading task comments."
        );
      } finally {
        setIsLoadingComments(false);
      }
    };

    void loadTaskComments();
  }, [authSession?.token, task?.id]);

  useEffect(
    () => () => {
      Object.values(subtaskAutosaveTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    },
    []
  );

  useEffect(() => {
    if (!shouldBlockUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlockUnsavedChanges]);

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
      return;
    }

    if (!task) {
      navigate(buildProjectSectionRoute(workspaceSlug, projectSlug, "tasks"), {
        replace: true,
        state: { workspace, project },
      });
    }
  }, [isResolving, navigate, project, projectSlug, task, workspace, workspaceSlug]);

  const handleFieldChange = useCallback((field, value) => {
    setSaveState("idle");
    setSaveMessage("");

    setTaskValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }, []);

  const saveTaskValues = async (nextValues) => {
    if (!authSession?.token || !task?.id) {
      return false;
    }

    const nextPayload = buildUpdatePayload(nextValues);
    const savedPayload = buildUpdatePayload(lastSavedValues);

    if (JSON.stringify(nextPayload) === JSON.stringify(savedPayload)) {
      return true;
    }

    setSaveState("saving");
    setSaveMessage("Saving changes...");

    try {
      const result = await updateTask(task.id, nextPayload, authSession.token);
      const updatedTask = result?.task;

      if (updatedTask) {
        setTask(updatedTask);
        setProjectTasks((currentTasks) =>
          currentTasks.map((projectTask) =>
            Number(projectTask.id) === Number(updatedTask.id) ? updatedTask : projectTask
          )
        );
        const normalizedValues = buildTaskFormValues(updatedTask);
        setTaskValues(normalizedValues);
        setLastSavedValues(normalizedValues);
      } else {
        setTaskValues(nextValues);
        setLastSavedValues(nextValues);
      }

      setSaveState("idle");
      setSaveMessage("");
      await showSuccessAlert(
        "Task updated",
        result?.message || "The task has been updated successfully."
      );
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error.message || "Unable to save changes");
      await showErrorAlert(
        "Unable to update task",
        error.message || "Something went wrong while saving the task."
      );
      return false;
    }
  };

  const handleCancelChanges = useCallback(() => {
    setTaskValues(lastSavedValues);
    setSaveState("idle");
    setSaveMessage("");
  }, [lastSavedValues]);

  const handleSaveChanges = useCallback(() => {
    void saveTaskValues(taskValues);
  }, [taskValues]);

  const handleAddSubtaskDraft = () => {
    setSubtaskDrafts((currentDrafts) => [...currentDrafts, buildSubtaskDraftValues()]);
  };

  const handleAddComment = async () => {
    const trimmedComment = getPlainTextFromHtml(commentDraft);

    if (!trimmedComment || !authSession?.token || !task?.id || isCreatingComment) {
      return;
    }

    setIsCreatingComment(true);

    try {
      const result = await createTaskComment(
        task.id,
        {
          comment: String(commentDraft || "").trim(),
        },
        authSession.token
      );
      const createdComment = result?.comment || null;

      if (createdComment) {
        setCommentEntries((currentComments) => [createdComment, ...currentComments]);
        setTask((currentTask) =>
          currentTask
            ? {
                ...currentTask,
                commentsCount: Number(currentTask.commentsCount || 0) + 1,
              }
            : currentTask
        );
        setProjectTasks((currentTasks) =>
          currentTasks.map((projectTask) =>
            Number(projectTask.id) === Number(task.id)
              ? {
                  ...projectTask,
                  commentsCount: Number(projectTask.commentsCount || 0) + 1,
                }
              : projectTask
          )
        );
      }

      setCommentDraft("");
    } catch (error) {
      await showErrorAlert(
        "Unable to add comment",
        error.message || "Something went wrong while creating the comment."
      );
    } finally {
      setIsCreatingComment(false);
    }
  };

  const handleStartCommentEdit = (commentItem) => {
    setEditingCommentId(Number(commentItem.id));
    setEditingCommentDraft(String(commentItem.comment || ""));
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentDraft("");
  };

  const handleUpdateComment = async (commentItem) => {
    const trimmedComment = getPlainTextFromHtml(editingCommentDraft);

    if (
      !trimmedComment ||
      !authSession?.token ||
      !task?.id ||
      !commentItem?.id ||
      isUpdatingComment
    ) {
      return;
    }

    setIsUpdatingComment(true);

    try {
      const result = await updateTaskComment(
        task.id,
        commentItem.id,
        {
          comment: String(editingCommentDraft || "").trim(),
        },
        authSession.token
      );
      const updatedComment = result?.comment || null;

      if (updatedComment) {
        setCommentEntries((currentComments) =>
          currentComments.map((currentComment) =>
            Number(currentComment.id) === Number(updatedComment.id) ? updatedComment : currentComment
          )
        );
      }

      setEditingCommentId(null);
      setEditingCommentDraft("");
    } catch (error) {
      await showErrorAlert(
        "Unable to update comment",
        error.message || "Something went wrong while updating the comment."
      );
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleSubtaskDraftChange = (localId, field, value) => {
    setSubtaskDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.localId === localId
          ? {
              ...draft,
              [field]: value,
            }
          : draft
      )
    );
  };

  const handleSubtaskDraftCompletionToggle = (localId, checked) => {
    handleSubtaskDraftChange(localId, "status", checked ? "done" : "todo");
  };

  const handleRemoveSubtaskDraft = (localId) => {
    setSubtaskDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.localId !== localId));
  };

  const handleCreateSubtask = async (draft) => {
    if (!authSession?.token || !project?.id || !workspace?.id || !task?.id) {
      await showErrorAlert(
        "Task context missing",
        "We could not resolve the current task, project, or workspace."
      );
      return;
    }

    setCreatingSubtaskIds((currentIds) => [...currentIds, draft.localId]);

    try {
      const result = await createTask(
        {
          title: String(draft.title || "").trim(),
          assignedBy: currentUserId || undefined,
          assignedTo: draft.assignedTo || undefined,
          status: draft.status || "todo",
          projectId: Number(project.id),
          workspaceId: Number(workspace.id),
          parentTaskId: Number(task.id),
          dueDate: draft.dueDate || undefined,
        },
        authSession.token
      );

      setSubtaskDrafts((currentDrafts) =>
        currentDrafts.filter((currentDraft) => currentDraft.localId !== draft.localId)
      );
      await loadProjectTasks(project.id, workspace.id, authSession.token);
      await showSuccessAlert(
        "Subtask created",
        result?.message || "The subtask has been created successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to create subtask",
        error.message || "Something went wrong while creating the subtask."
      );
    } finally {
      setCreatingSubtaskIds((currentIds) => currentIds.filter((id) => id !== draft.localId));
    }
  };

  const updateSubtaskInState = (subtaskId, updates) => {
    setProjectTasks((currentTasks) =>
      currentTasks.map((projectTask) =>
        Number(projectTask.id) === Number(subtaskId)
          ? {
              ...projectTask,
              ...updates,
            }
          : projectTask
      )
    );
  };

  const buildSubtaskUpdatePayload = (subtask, overrides = {}) => ({
    title: String(overrides.title ?? subtask.title ?? "").trim(),
    description: String(overrides.description ?? subtask.description ?? "").trim(),
    status: overrides.status ?? subtask.status ?? "todo",
    priority: overrides.priority ?? subtask.priority ?? "medium",
    taskType: overrides.taskType ?? subtask.taskType ?? "feature",
    parentTaskId:
      overrides.parentTaskId ??
      (subtask.parentTaskId === null || subtask.parentTaskId === undefined
        ? null
        : Number(subtask.parentTaskId)),
    assignedBy:
      overrides.assignedBy ??
      (subtask.assignedBy === null || subtask.assignedBy === undefined
        ? null
        : String(subtask.assignedBy)),
    assignedTo:
      overrides.assignedTo ??
      (subtask.assignedTo === null || subtask.assignedTo === undefined
        ? null
        : String(subtask.assignedTo)),
    startDate: overrides.startDate ?? normalizeDateInputValue(subtask.startDate),
    dueDate: overrides.dueDate ?? normalizeDateInputValue(subtask.dueDate),
    completedAt: overrides.completedAt ?? normalizeDateInputValue(subtask.completedAt),
    tags: Array.isArray(overrides.tags) ? overrides.tags : Array.isArray(subtask.tags) ? subtask.tags : [],
  });

  const persistSubtaskUpdate = async (subtaskId, overrides = {}) => {
    const normalizedSubtaskId = Number(subtaskId);
    const subtask = projectTasks.find(
      (projectTask) => Number(projectTask.id) === normalizedSubtaskId
    );

    if (!authSession?.token || !subtask) {
      return;
    }

    if (updatingSubtaskIds.includes(normalizedSubtaskId)) {
      scheduleSubtaskAutosave(normalizedSubtaskId, overrides);
      return;
    }

    delete pendingSubtaskOverridesRef.current[normalizedSubtaskId];

    setUpdatingSubtaskIds((currentIds) => [...currentIds, normalizedSubtaskId]);

    try {
      const result = await updateTask(
        normalizedSubtaskId,
        buildSubtaskUpdatePayload(subtask, overrides),
        authSession.token
      );

      if (result?.task) {
        updateSubtaskInState(normalizedSubtaskId, result.task);
      }

      await showSuccessAlert(
        "Subtask updated",
        result?.message || "The subtask has been updated successfully."
      );
    } catch (error) {
      await loadProjectTasks(project?.id, workspace?.id, authSession.token);
      await showErrorAlert(
        "Unable to update subtask",
        error.message || "Something went wrong while saving the subtask."
      );
    } finally {
      setUpdatingSubtaskIds((currentIds) =>
        currentIds.filter((id) => id !== normalizedSubtaskId)
      );
    }
  };

  const scheduleSubtaskAutosave = (subtaskId, overrides = {}) => {
    const normalizedSubtaskId = Number(subtaskId);
    const existingOverrides = pendingSubtaskOverridesRef.current[normalizedSubtaskId] || {};

    pendingSubtaskOverridesRef.current[normalizedSubtaskId] = {
      ...existingOverrides,
      ...overrides,
    };

    if (subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId]) {
      window.clearTimeout(subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId]);
    }

    subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId] = window.setTimeout(() => {
      delete subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId];
      void persistSubtaskUpdate(
        normalizedSubtaskId,
        pendingSubtaskOverridesRef.current[normalizedSubtaskId] || {}
      );
    }, SUBTASK_AUTOSAVE_DELAY_MS);
  };

  const flushSubtaskAutosave = async (subtaskId) => {
    const normalizedSubtaskId = Number(subtaskId);
    const pendingOverrides = pendingSubtaskOverridesRef.current[normalizedSubtaskId];

    if (!pendingOverrides) {
      return;
    }

    if (subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId]) {
      window.clearTimeout(subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId]);
      delete subtaskAutosaveTimeoutsRef.current[normalizedSubtaskId];
    }

    await persistSubtaskUpdate(normalizedSubtaskId, pendingOverrides);
  };

  const handleExistingSubtaskFieldChange = (subtaskId, field, value) => {
    updateSubtaskInState(subtaskId, { [field]: value });
  };

  const handleExistingSubtaskCompletionToggle = (subtask, checked) => {
    const nextStatus = checked ? "done" : "todo";
    const nextCompletedAt = checked
      ? normalizeDateInputValue(subtask.completedAt) || getTodayDateOnly()
      : null;

    updateSubtaskInState(subtask.id, {
      status: nextStatus,
      completedAt: nextCompletedAt,
    });

    scheduleSubtaskAutosave(subtask.id, {
      status: nextStatus,
      completedAt: nextCompletedAt,
    });
  };

  const handleOpenSubtask = (subtask) => {
    if (!workspace?.slug || !project?.slug || !subtask?.slug) {
      return;
    }
    const nextRoute = buildTaskDetailsRoute(workspace.slug, project.slug, subtask.slug);

    if (!shouldBlockUnsavedChanges) {
      navigate(nextRoute, {
        state: {
          workspace,
          project,
          task: subtask,
        },
      });
      return;
    }

    void (async () => {
      const confirmation = await showConfirmAlert(
        "Save changes before leaving?",
        "You have unsaved task changes.",
        {
          confirmButtonText: "Save",
          cancelButtonText: "Discard",
          allowOutsideClick: false,
        }
      );

      if (confirmation.isConfirmed) {
        const didSave = await saveTaskValues(taskValues);

        if (!didSave) {
          return;
        }
      } else if (confirmation.dismiss !== "cancel") {
        return;
      }

      navigate(nextRoute, {
        state: {
          workspace,
          project,
          task: subtask,
        },
      });
    })();
  };

  const handleDeleteSubtask = async (subtask) => {
    if (!authSession?.token || !subtask?.id) {
      await showErrorAlert("Signin required", "Please sign in again to delete the subtask.");
      return;
    }

    const confirmation = await showConfirmAlert(
      "Delete subtask?",
      `This will remove ${subtask.title} from the task hierarchy.`,
      {
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingSubtaskIds((currentIds) => [...currentIds, Number(subtask.id)]);

    try {
      const result = await deleteTask(subtask.id, authSession.token);
      await loadProjectTasks(project?.id, workspace?.id, authSession.token);
      await showSuccessAlert(
        "Subtask deleted",
        result?.message || "The subtask has been deleted successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to delete subtask",
        error.message || "Something went wrong while deleting the subtask."
      );
    } finally {
      setDeletingSubtaskIds((currentIds) =>
        currentIds.filter((id) => id !== Number(subtask.id))
      );
    }
  };

  const handleAttemptNavigation = async (to) => {
    if (!to || to === location.pathname) {
      return;
    }

    if (!shouldBlockUnsavedChanges) {
      navigate(to);
      return;
    }

    const confirmation = await showConfirmAlert(
      "Save changes before leaving?",
      "You have unsaved task changes.",
      {
        confirmButtonText: "Save",
        cancelButtonText: "Discard",
        allowOutsideClick: false,
      }
    );

    if (confirmation.isConfirmed) {
      const didSave = await saveTaskValues(taskValues);

      if (didSave) {
        navigate(to);
      }
      return;
    }

    if (confirmation.dismiss === "cancel") {
      navigate(to);
    }
  };

  const handleTagsChange = useCallback((_, value) => {
    handleFieldChange("tags", value);
  }, [handleFieldChange]);

  const commentsSection = useMemo(
    () => (
      <Sheet
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: "10px",
          borderColor: "rgba(220, 226, 244, 0.95)",
          backgroundColor: "#fff",
          boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 2.1, py: 2.1 }}>
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography level="title-sm" sx={{ fontWeight: 700, color: "#23314d" }}>
                  Comments
                </Typography>
                <Typography level="body-sm" sx={{ color: "#60708e", mt: 0.25 }}>
                  Discuss progress, blockers, and implementation notes with your team.
                </Typography>
              </Box>
              <Typography
                level="body-sm"
                sx={{
                  px: 1,
                  py: 0.45,
                  borderRadius: "999px",
                  backgroundColor: "rgba(49, 85, 255, 0.08)",
                  color: "#3155ff",
                  fontWeight: 700,
                }}
              >
                {commentEntries.length} {commentEntries.length === 1 ? "comment" : "comments"}
              </Typography>
            </Stack>

            <Sheet
              variant="outlined"
              sx={{
                borderRadius: "14px",
                borderColor: "rgba(220, 226, 244, 0.95)",
                backgroundColor: "#fff",
                p: 1.1,
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "rgba(49, 85, 255, 0.14)",
                      color: "#3155ff",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                    }}
                  >
                    {buildUserInitials(fullName)}
                  </Box>
                  <FormControl sx={{ flex: 1 }}>
                    <RichTextEditor
                      value={commentDraft}
                      onChange={(value) => setCommentDraft(value)}
                      placeholder="Write a comment for this task..."
                      minHeight={140}
                    />
                  </FormControl>
                </Stack>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={0.75}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Typography level="body-xs" sx={{ color: "#7b8596" }}>
                    Comments are visible to team members who can access this task.
                  </Typography>
                  <Button
                    onClick={() => {
                      void handleAddComment();
                    }}
                    loading={isCreatingComment}
                    disabled={!getPlainTextFromHtml(commentDraft) || isCreatingComment}
                    sx={{ color: "var(--color-font-secondary)" }}
                  >
                    Add comment
                  </Button>
                </Stack>
              </Stack>
            </Sheet>

            {isLoadingComments ? (
              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: "14px",
                  borderColor: "rgba(220, 226, 244, 0.95)",
                  backgroundColor: "#fff",
                  p: 1.5,
                }}
              >
                <Typography level="body-sm" sx={{ color: "#60708e", fontWeight: 600 }}>
                  Loading comments...
                </Typography>
              </Sheet>
            ) : commentEntries.length > 0 ? (
              <Stack spacing={1}>
                {commentEntries.map((commentItem) => (
                  <Sheet
                    key={commentItem.id}
                    variant="outlined"
                    onMouseEnter={() => setHoveredCommentId(Number(commentItem.id))}
                    onMouseLeave={() =>
                      setHoveredCommentId((currentId) =>
                        currentId === Number(commentItem.id) ? null : currentId
                      )
                    }
                    sx={{
                      borderRadius: "14px",
                      borderColor: "rgba(220, 226, 244, 0.95)",
                      backgroundColor: "#fff",
                      p: 1.1,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(35, 49, 77, 0.08)",
                          color: "#23314d",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                        }}
                      >
                        {buildUserInitials(commentItem.createdByName)}
                      </Box>
                      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={0.5}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography sx={{ fontWeight: 700, color: "#23314d" }}>
                              {commentItem.createdByName}
                            </Typography>
                          </Stack>
                        </Stack>
                        {Number(editingCommentId) === Number(commentItem.id) ? (
                          <Stack spacing={1}>
                            <RichTextEditor
                              value={editingCommentDraft}
                              onChange={(value) => setEditingCommentDraft(value)}
                              placeholder="Update your comment..."
                              minHeight={120}
                            />
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="sm"
                                variant="plain"
                                color="neutral"
                                onClick={handleCancelCommentEdit}
                                disabled={isUpdatingComment}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  void handleUpdateComment(commentItem);
                                }}
                                loading={isUpdatingComment}
                                disabled={!getPlainTextFromHtml(editingCommentDraft) || isUpdatingComment}
                                sx={{ color: "var(--color-font-secondary)" }}
                              >
                                Update
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack spacing={0.35} alignItems="flex-start">
                            <Box
                              component="div"
                              sx={{
                                color: "#3b4863",
                                overflowWrap: "anywhere",
                                "& p": {
                                  m: 0,
                                },
                                "& p + p": {
                                  mt: 0.75,
                                },
                                "& ul, & ol": {
                                  pl: 2.5,
                                  my: 0.75,
                                },
                                "& blockquote": {
                                  m: 0,
                                  pl: 1.25,
                                  borderLeft: "3px solid rgba(49, 85, 255, 0.18)",
                                  color: "#52627d",
                                },
                              }}
                              dangerouslySetInnerHTML={{ __html: commentItem.comment }}
                            />
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                              <Typography level="body-xs" sx={{ color: "#7b8596" }}>
                                {formatCommentTimestamp(commentItem.updatedAt || commentItem.createdAt)}
                              </Typography>
                              {Number(commentItem.createdBy) === Number(currentUserId) ? (
                                <Button
                                  size="sm"
                                  variant="plain"
                                  color="neutral"
                                  startDecorator={<EditIcon />}
                                  onClick={() => handleStartCommentEdit(commentItem)}
                                  disabled={
                                    isUpdatingComment &&
                                    Number(editingCommentId) === Number(commentItem.id)
                                  }
                                  sx={{
                                    minHeight: "auto",
                                    px: 0.5,
                                    py: 0.2,
                                    color: "#3155ff",
                                    opacity:
                                      hoveredCommentId === Number(commentItem.id) ? 1 : 0,
                                    visibility:
                                      hoveredCommentId === Number(commentItem.id)
                                        ? "visible"
                                        : "hidden",
                                    transition: "opacity 0.18s ease, visibility 0.18s ease",
                                  }}
                                >
                                  Edit
                                </Button>
                              ) : null}
                            </Stack>
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </Sheet>
                ))}
              </Stack>
            ) : (
              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: "14px",
                  borderStyle: "dashed",
                  borderColor: "rgba(182, 193, 223, 0.9)",
                  backgroundColor: "#fff",
                  p: 1.5,
                }}
              >
                <Stack spacing={0.35}>
                  <Typography sx={{ fontWeight: 700, color: "#23314d" }}>
                    No comments yet
                  </Typography>
                  <Typography level="body-sm" sx={{ color: "#60708e" }}>
                    Start the discussion here for blockers, decisions, or implementation notes.
                  </Typography>
                </Stack>
              </Sheet>
            )}
          </Stack>
        </Box>
      </Sheet>
    ),
    [
      commentDraft,
      commentEntries,
      currentUserId,
      editingCommentDraft,
      editingCommentId,
      fullName,
      hoveredCommentId,
      isCreatingComment,
      isLoadingComments,
      isUpdatingComment,
    ]
  );

  const subtasksSection = useMemo(
    () => (
      <>
        <Stack alignItems="flex-start" spacing={1}>
          <Button
            variant="soft"
            color="primary"
            startDecorator={<PlusIcon />}
            onClick={handleAddSubtaskDraft}
            sx={{ borderRadius: "10px", fontWeight: 600 }}
          >
            Add sub task
          </Button>
        </Stack>
        <Sheet
          variant="soft"
          sx={{
            borderRadius: "12px",
            border: "1px solid rgba(220, 226, 244, 0.95)",
            backgroundColor: "#fbfcff",
            p: 1.25,
          }}
        >
          <Stack spacing={1.1}>
            <Typography level="title-sm" sx={{ fontWeight: 700, color: "#23314d" }}>
              Subtasks
            </Typography>

            {subtaskDrafts.map((draft) => (
              <Sheet
                key={draft.localId}
                variant="outlined"
                sx={{
                  borderRadius: "12px",
                  borderColor: "rgba(220, 226, 244, 0.95)",
                  backgroundColor: "#fff",
                  p: 1.15,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <FormControl
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Checkbox
                      checked={isCompletedStatus(draft.status)}
                      onChange={(event) =>
                        handleSubtaskDraftCompletionToggle(
                          draft.localId,
                          event.target.checked
                        )
                      }
                    />
                  </FormControl>
                  <FormControl sx={{ flex: 1.8 }}>
                    <Input
                      value={draft.title}
                      onChange={(event) =>
                        handleSubtaskDraftChange(
                          draft.localId,
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="Title"
                    />
                  </FormControl>
                  <FormControl sx={{ flex: 1.2 }}>
                    <Select
                      value={draft.assignedTo || null}
                      onChange={(_, value) =>
                        handleSubtaskDraftChange(
                          draft.localId,
                          "assignedTo",
                          value || ""
                        )
                      }
                      placeholder="Select assignee"
                    >
                      {projectUserOptions.map((option) => (
                        <Option key={option.id} value={String(option.id)}>
                          {option.label}
                        </Option>
                      ))}
                      placeholder="Assigned to"
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <Input
                      type="date"
                      value={draft.dueDate}
                      onChange={(event) =>
                        handleSubtaskDraftChange(
                          draft.localId,
                          "dueDate",
                          event.target.value
                        )
                      }
                      slotProps={{ input: { "aria-label": "Due date" } }}
                    />
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <Select
                      value={draft.status}
                      onChange={(_, value) =>
                        handleSubtaskDraftChange(
                          draft.localId,
                          "status",
                          value || "todo"
                        )
                      }
                    >
                      {statusOptions.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                      placeholder="Status"
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button
                      loading={creatingSubtaskIds.includes(draft.localId)}
                      onClick={() => {
                        void handleCreateSubtask(draft);
                      }}
                      sx={{ color: "var(--color-font-secondary)" }}
                    >
                      Create
                    </Button>
                    <IconButton
                      variant="plain"
                      color="danger"
                      onClick={() => handleRemoveSubtaskDraft(draft.localId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Sheet>
            ))}

            {subtasks.map((subtask) => (
              <Sheet
                key={subtask.id}
                variant="outlined"
                sx={{
                  borderRadius: "12px",
                  borderColor: "rgba(220, 226, 244, 0.95)",
                  backgroundColor: "#fff",
                  p: 1.15,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <FormControl
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Checkbox
                      checked={isCompletedStatus(subtask.status)}
                      disabled={updatingSubtaskIds.includes(Number(subtask.id))}
                      onChange={(event) =>
                        handleExistingSubtaskCompletionToggle(
                          subtask,
                          event.target.checked
                        )
                      }
                    />
                  </FormControl>
                  <FormControl sx={{ flex: 1.8 }}>
                    <Input
                      value={subtask.title || ""}
                      placeholder="Title"
                      disabled={updatingSubtaskIds.includes(Number(subtask.id))}
                      onChange={(event) => {
                        const nextTitle = event.target.value;

                        handleExistingSubtaskFieldChange(
                          subtask.id,
                          "title",
                          nextTitle
                        );
                        scheduleSubtaskAutosave(subtask.id, {
                          title: nextTitle,
                        });
                      }}
                      onBlur={() => {
                        void flushSubtaskAutosave(subtask.id);
                      }}
                    />
                  </FormControl>
                  <FormControl sx={{ flex: 1.2 }}>
                    <Select
                      value={subtask.assignedTo ? String(subtask.assignedTo) : null}
                      placeholder="Assigned to"
                      disabled={updatingSubtaskIds.includes(Number(subtask.id))}
                      onChange={(_, value) => {
                        handleExistingSubtaskFieldChange(
                          subtask.id,
                          "assignedTo",
                          value || null
                        );

                        const selectedOption = projectUserOptions.find(
                          (option) => String(option.id) === String(value || "")
                        );

                        handleExistingSubtaskFieldChange(
                          subtask.id,
                          "assignedToName",
                          selectedOption?.label || null
                        );

                        scheduleSubtaskAutosave(subtask.id, {
                          assignedTo: value || null,
                        });
                      }}
                    >
                      {projectUserOptions.map((option) => (
                        <Option key={option.id} value={String(option.id)}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <Input
                      value={normalizeDateInputValue(subtask.dueDate)}
                      placeholder="Due date"
                      type="date"
                      disabled={updatingSubtaskIds.includes(Number(subtask.id))}
                      onChange={(event) => {
                        const nextDueDate = event.target.value;

                        handleExistingSubtaskFieldChange(
                          subtask.id,
                          "dueDate",
                          nextDueDate
                        );
                        scheduleSubtaskAutosave(subtask.id, {
                          dueDate: nextDueDate,
                        });
                      }}
                      onBlur={() => {
                        void flushSubtaskAutosave(subtask.id);
                      }}
                    />
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <Select
                      value={subtask.status || null}
                      placeholder="Status"
                      disabled={updatingSubtaskIds.includes(Number(subtask.id))}
                      onChange={(_, value) => {
                        const nextStatus = value || "todo";
                        const nextCompletedAt = isCompletedStatus(nextStatus)
                          ? normalizeDateInputValue(subtask.completedAt) || getTodayDateOnly()
                          : null;

                        handleExistingSubtaskFieldChange(subtask.id, "status", nextStatus);
                        handleExistingSubtaskFieldChange(
                          subtask.id,
                          "completedAt",
                          nextCompletedAt
                        );

                        scheduleSubtaskAutosave(subtask.id, {
                          status: nextStatus,
                          completedAt: nextCompletedAt,
                        });
                      }}
                    >
                      {statusOptions.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      variant="plain"
                      color="neutral"
                      onClick={() => handleOpenSubtask(subtask)}
                    >
                      <EyeIcon />
                    </IconButton>
                    <IconButton
                      variant="plain"
                      color="danger"
                      loading={deletingSubtaskIds.includes(Number(subtask.id))}
                      disabled={deletingSubtaskIds.includes(Number(subtask.id))}
                      onClick={() => {
                        void handleDeleteSubtask(subtask);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Sheet>
            ))}

            {subtaskDrafts.length === 0 && subtasks.length === 0 ? (
              <Typography level="body-sm" sx={{ color: "#60708e" }}>
                No subtasks added yet.
              </Typography>
            ) : null}
          </Stack>
        </Sheet>
      </>
    ),
    [
      creatingSubtaskIds,
      deletingSubtaskIds,
      projectUserOptions,
      subtaskDrafts,
      subtasks,
      updatingSubtaskIds,
    ]
  );

  return (
    <AppLayout
      initialSidebarCollapsed
      sidebar={
        <ProjectsSidebar
          items={sidebarItems}
          backToApplicationsRoute={buildWorkspaceApplicationsRoute(workspaceSlug)}
          backToProjectsRoute={buildProjectSectionRoute(workspaceSlug, projectSlug, "tasks")}
          backToProjectsLabel="Back to Tasks"
          showBackToWorkspace={false}
          onNavigateAttempt={handleAttemptNavigation}
        />
      }
      titleContent={
        <Typography sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}>
          {headerTitle}
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
          px: { xs: 1.25, md: 1.75 },
          py: { xs: 1.25, md: 1.75 },
        }}
      >
        <Stack spacing={1.5}>
        <Sheet
          variant="outlined"
          sx={{
            width: "100%",
            borderRadius: "10px",
            borderColor: "rgba(220, 226, 244, 0.95)",
            backgroundColor: "#fff",
            boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
            overflow: "hidden",
          }}
        >
          {isResolving && !task ? (
            <Stack spacing={0}>
              <Box sx={{ px: 2.1, py: 3 }}>
                <Typography sx={{ fontWeight: 700, color: "#23314d" }}>
                  Loading task details...
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={0}>
              <Box sx={{ px: 2.1, py: 2.1 }}>
                <Stack spacing={2.1}>
                  <TaskHeaderSection
                    parentTaskTitle={task?.parentTaskTitle || ""}
                    parentTaskNavigateLabel={
                      task?.parentTaskTitle ? `Parent Service - ${task.parentTaskTitle}` : ""
                    }
                    onOpenParentTask={() => {
                      if (!task?.parentTaskSlug || !workspace?.slug || !project?.slug) {
                        return;
                      }

                      navigate(
                        buildTaskDetailsRoute(
                          workspace.slug,
                          project.slug,
                          task.parentTaskSlug
                        ),
                        {
                          state: {
                            workspace,
                            project,
                          },
                        }
                      );
                    }}
                    title={taskValues.title}
                    description={taskValues.description}
                    onFieldChange={handleFieldChange}
                  />
                  {subtasksSection}
                  <TaskMetadataSection
                    status={taskValues.status}
                    priority={taskValues.priority}
                    taskType={taskValues.taskType}
                    assignedBy={taskValues.assignedBy}
                    assignedTo={taskValues.assignedTo}
                    createdByName={task?.createdByName || "-"}
                    startDate={taskValues.startDate}
                    dueDate={taskValues.dueDate}
                    completedDate={taskValues.completedDate}
                    tags={taskValues.tags}
                    projectUserOptions={projectUserOptions}
                    onFieldChange={handleFieldChange}
                    onTagsChange={handleTagsChange}
                  />

                  <Typography
                    level="body-sm"
                    sx={{
                      pt: 0.35,
                      textAlign: "right",
                      color:
                        saveState === "error"
                          ? "#d14343"
                          : saveState === "saving"
                            ? "#3155ff"
                            : "#60708e",
                      fontWeight: saveState === "saving" || saveState === "error" ? 600 : 500,
                    }}
                  >
                    {saveMessage || (hasUnsavedChanges ? "You have unsaved changes." : "")}
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="plain"
                      color="neutral"
                      onClick={handleCancelChanges}
                      disabled={saveState === "saving" || !hasUnsavedChanges}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      loading={saveState === "saving"}
                      disabled={saveState === "saving" || !hasUnsavedChanges}
                      sx={{ color: "var(--color-font-secondary)" }}
                    >
                      Save
                    </Button>
                  </Stack>
                  </Stack>
              </Box>
            </Stack>
          )}
        </Sheet>
        {commentsSection}
        </Stack>
      </Box>
    </AppLayout>
  );
}
