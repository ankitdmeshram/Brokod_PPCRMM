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
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import RichTextEditor from "../components/common/RichTextEditor";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import {
  DeleteIcon,
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
  buildWorkspaceProjectsRoute,
} from "../router/authRoutes";
import {
  showAccessDeniedAlert,
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../services/alert.service";
import { fetchProjectUsers, fetchProjectBySlug } from "../services/project.service";
import { createTask, deleteTask, fetchAllTasks, fetchTaskBySlug, updateTask } from "../services/task.service";
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

const isCompletedStatus = (value) => String(value || "").trim().toLowerCase() === "done";
const getTodayDateOnly = () => new Date().toISOString().slice(0, 10);
const SUBTASK_AUTOSAVE_DELAY_MS = 400;
const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

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
      setSaveState("idle");
      setSaveMessage("");
    }
  }, [task]);

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

  const handleFieldChange = (field, value) => {
    setSaveState("idle");
    setSaveMessage("");

    setTaskValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

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

  const handleCancelChanges = () => {
    setTaskValues(lastSavedValues);
    setSaveState("idle");
    setSaveMessage("");
  };

  const handleSaveChanges = () => {
    void saveTaskValues(taskValues);
  };

  const handleAddSubtaskDraft = () => {
    setSubtaskDrafts((currentDrafts) => [...currentDrafts, buildSubtaskDraftValues()]);
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

  const handleSelectChange = (field) => (_, value) => {
    handleFieldChange(field, value || "");
  };

  const handleTagsChange = (_, value) => {
    handleFieldChange("tags", value);
  };

  return (
    <AppLayout
      initialSidebarCollapsed
      sidebar={
        <ProjectsSidebar
          items={sidebarItems}
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
                <Stack spacing={1}>
                  {task?.parentTaskTitle ? (
                    <Button
                      variant="plain"
                      color="neutral"
                      onClick={() => {
                        if (!task.parentTaskSlug || !workspace?.slug || !project?.slug) {
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
                      {`Parent Service - ${task.parentTaskTitle}`}
                    </Button>
                  ) : null}
                  <Textarea
                    value={taskValues.title}
                    onChange={(event) => handleFieldChange("title", event.target.value)}
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
                      value={taskValues.description}
                      onChange={(value) => handleFieldChange("description", value)}
                      minHeight={220}
                    />
                  </FormControl>
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
                                onChange={(event) =>
                                  {
                                    const nextTitle = event.target.value;

                                    handleExistingSubtaskFieldChange(
                                      subtask.id,
                                      "title",
                                      nextTitle
                                    );
                                    scheduleSubtaskAutosave(subtask.id, {
                                      title: nextTitle,
                                    });
                                  }
                                }
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
                                onChange={(event) =>
                                  {
                                    const nextDueDate = event.target.value;

                                    handleExistingSubtaskFieldChange(
                                      subtask.id,
                                      "dueDate",
                                      nextDueDate
                                    );
                                    scheduleSubtaskAutosave(subtask.id, {
                                      dueDate: nextDueDate,
                                    });
                                  }
                                }
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
                </Stack>

                <Stack spacing={1}>
                  <Typography level="title-sm" sx={{ fontWeight: 700, color: "#23314d" }}>
                    Workflow
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={taskValues.status}
                        onChange={handleSelectChange("status")}
                      >
                        {statusOptions.map((option) => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={taskValues.priority}
                        onChange={handleSelectChange("priority")}
                      >
                        {priorityOptions.map((option) => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Task type</FormLabel>
                      <Select
                        value={taskValues.taskType}
                        onChange={handleSelectChange("taskType")}
                      >
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
                      <Select
                        value={taskValues.assignedBy}
                        onChange={handleSelectChange("assignedBy")}
                      >
                        {projectUserOptions.map((option) => (
                          <Option key={option.id} value={String(option.id)}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Assigned to</FormLabel>
                      <Select
                        value={taskValues.assignedTo}
                        onChange={handleSelectChange("assignedTo")}
                      >
                        {projectUserOptions.map((option) => (
                          <Option key={option.id} value={String(option.id)}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Created by</FormLabel>
                      <Input value={task?.createdByName || "-"} readOnly />
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
                        value={taskValues.startDate}
                        onChange={(event) => handleFieldChange("startDate", event.target.value)}
                      />
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Due date</FormLabel>
                      <Input
                        type="date"
                        value={taskValues.dueDate}
                        onChange={(event) => handleFieldChange("dueDate", event.target.value)}
                      />
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Completed date</FormLabel>
                      <Input
                        type="date"
                        value={taskValues.completedDate}
                        onChange={(event) => handleFieldChange("completedDate", event.target.value)}
                      />
                    </FormControl>
                  </Stack>
                  <FormControl>
                    <FormLabel>Tags</FormLabel>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={tagSuggestions}
                      value={taskValues.tags}
                      onChange={handleTagsChange}
                      placeholder="Add task tags"
                    />
                  </FormControl>
                </Stack>

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
      </Box>
    </AppLayout>
  );
}
