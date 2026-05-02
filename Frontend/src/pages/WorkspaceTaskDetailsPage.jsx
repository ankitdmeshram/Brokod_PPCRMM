import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import {
  GridIcon,
  NotificationIcon,
  SettingsIcon,
  TasksIcon,
} from "../components/workspace/WorkspaceIcons";
import { useAuthContext } from "../context/AuthContext";
import {
  APP_ROUTES,
  buildProjectSectionRoute,
  buildWorkspaceProjectsRoute,
} from "../router/authRoutes";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../services/alert.service";
import { fetchProjectUsers, fetchProjectBySlug } from "../services/project.service";
import { fetchTaskBySlug, updateTask } from "../services/task.service";
import { fetchWorkspaces } from "../services/workspace.service";

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

const formatDateTime = (value) => {
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
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildUserLabel = (user = {}) =>
  `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim() ||
  user.email ||
  `User ${user.id}`;

const buildTaskFormValues = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "todo",
  priority: task?.priority || "medium",
  taskType: task?.taskType || "feature",
  assignedBy: task?.assignedBy ? String(task.assignedBy) : "",
  assignedTo: task?.assignedTo ? String(task.assignedTo) : "",
  startDate: task?.startDate || "",
  dueDate: task?.dueDate || "",
  completedDate: task?.completedAt || "",
  tags: Array.isArray(task?.tags) ? task.tags : [],
});

const buildUpdatePayload = (values) => ({
  title: String(values.title || "").trim(),
  description: String(values.description || "").trim(),
  status: values.status,
  priority: values.priority,
  taskType: values.taskType,
  assignedBy: values.assignedBy || null,
  assignedTo: values.assignedTo || null,
  startDate: values.startDate || null,
  dueDate: values.dueDate || null,
  completedAt: values.completedDate || null,
  tags: Array.isArray(values.tags) ? values.tags : [],
});

export default function WorkspaceTaskDetailsPage() {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceSlug = "", projectSlug = "", taskSlug = "" } = useParams();
  const routedWorkspace = location.state?.workspace || null;
  const routedProject = location.state?.project || null;
  const routedTask = location.state?.task || null;
  const [workspace, setWorkspace] = useState(() => routedWorkspace);
  const [project, setProject] = useState(() => routedProject);
  const [task, setTask] = useState(() => routedTask);
  const [projectUsers, setProjectUsers] = useState([]);
  const [taskValues, setTaskValues] = useState(() => buildTaskFormValues(routedTask));
  const [lastSavedValues, setLastSavedValues] = useState(() => buildTaskFormValues(routedTask));
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isResolving, setIsResolving] = useState(true);

  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";

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
      {
        key: "settings",
        icon: <SettingsIcon />,
        label: "Settings",
        to: buildProjectSectionRoute(workspaceSlug, projectSlug, "settings"),
      },
    ],
    [projectSlug, workspaceSlug]
  );

  const projectUserOptions = useMemo(
    () =>
      projectUsers.map((projectUser) => ({
        id: Number(projectUser.user?.id || projectUser.userId),
        label: buildUserLabel(projectUser.user || {}),
      })),
    [projectUsers]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      JSON.stringify(buildUpdatePayload(taskValues)) !==
      JSON.stringify(buildUpdatePayload(lastSavedValues)),
    [lastSavedValues, taskValues]
  );
  const shouldBlockUnsavedChanges = hasUnsavedChanges && saveState !== "saving";

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
          const projectResult = await fetchProjectBySlug(projectSlug, authSession.token);
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

        if (routedTask && routedTask.slug === taskSlug) {
          setTask(routedTask);
          return;
        }

        if (!taskSlug) {
          setTask(null);
          return;
        }

        const taskResult = await fetchTaskBySlug(taskSlug, authSession.token);
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
  }, [authSession?.token, project, projectSlug, routedProject, routedTask, routedWorkspace, taskSlug, workspace, workspaceSlug]);

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
    if (task) {
      const nextValues = buildTaskFormValues(task);
      setTaskValues(nextValues);
      setLastSavedValues(nextValues);
      setSaveState("idle");
      setSaveMessage("");
    }
  }, [task]);

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
          {task?.title || "Task"}
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
          px: { xs: 1.5, md: 2 },
          py: { xs: 1.5, md: 2 },
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
              <Box sx={{ px: 2.5, py: 3.5 }}>
                <Typography sx={{ fontWeight: 700, color: "#23314d" }}>
                  Loading task details...
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={0}>
              <Box sx={{ px: 2.5, py: 2.5 }}>
                <Stack spacing={2.5}>
                <Stack spacing={1.25}>
                  <Typography level="title-md" sx={{ fontWeight: 700, color: "#23314d" }}>
                    Core Details
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Task title</FormLabel>
                      <Input
                        value={taskValues.title}
                        onChange={(event) => handleFieldChange("title", event.target.value)}
                      />
                    </FormControl>
                    <FormControl sx={{ width: { xs: "100%", md: 220 } }}>
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
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                      minRows={5}
                      value={taskValues.description}
                      onChange={(event) => handleFieldChange("description", event.target.value)}
                    />
                  </FormControl>
                </Stack>

                <Stack spacing={1.25}>
                  <Typography level="title-md" sx={{ fontWeight: 700, color: "#23314d" }}>
                    Workflow
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
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
                  </Stack>
                </Stack>

                <Stack spacing={1.25}>
                  <Typography level="title-md" sx={{ fontWeight: 700, color: "#23314d" }}>
                    Assignment
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
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

                <Stack spacing={1.25}>
                  <Typography level="title-md" sx={{ fontWeight: 700, color: "#23314d" }}>
                    Dates And Tags
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
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
                      value={taskValues.tags}
                      onChange={handleTagsChange}
                      placeholder="Add task tags"
                    />
                  </FormControl>
                </Stack>

                <Stack spacing={1.25}>
                  <Typography level="title-md" sx={{ fontWeight: 700, color: "#23314d" }}>
                    Metadata
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <Sheet variant="soft" sx={{ flex: 1, borderRadius: "12px", px: 1.5, py: 1.25, backgroundColor: "#f7f9ff" }}>
                      <Typography level="body-xs" sx={{ color: "#60708e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Project ID
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: "#22304b" }}>{task?.projectId || "-"}</Typography>
                    </Sheet>
                    <Sheet variant="soft" sx={{ flex: 1, borderRadius: "12px", px: 1.5, py: 1.25, backgroundColor: "#f7f9ff" }}>
                      <Typography level="body-xs" sx={{ color: "#60708e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Workspace ID
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: "#22304b" }}>{task?.workspaceId || "-"}</Typography>
                    </Sheet>
                    <Sheet variant="soft" sx={{ flex: 1, borderRadius: "12px", px: 1.5, py: 1.25, backgroundColor: "#f7f9ff" }}>
                      <Typography level="body-xs" sx={{ color: "#60708e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Comments
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: "#22304b" }}>{task?.commentsCount ?? 0}</Typography>
                    </Sheet>
                    <Sheet variant="soft" sx={{ flex: 1, borderRadius: "12px", px: 1.5, py: 1.25, backgroundColor: "#f7f9ff" }}>
                      <Typography level="body-xs" sx={{ color: "#60708e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Activity Logs
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: "#22304b" }}>{task?.activityLogsCount ?? 0}</Typography>
                    </Sheet>
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <Sheet variant="soft" sx={{ flex: 1, borderRadius: "12px", px: 1.5, py: 1.25, backgroundColor: "#f7f9ff" }}>
                      <Typography level="body-xs" sx={{ color: "#60708e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Created At
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: "#22304b" }}>{formatDateTime(task?.createdAt)}</Typography>
                    </Sheet>
                    <Sheet variant="soft" sx={{ flex: 1, borderRadius: "12px", px: 1.5, py: 1.25, backgroundColor: "#f7f9ff" }}>
                      <Typography level="body-xs" sx={{ color: "#60708e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Updated At
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: "#22304b" }}>{formatDateTime(task?.updatedAt)}</Typography>
                    </Sheet>
                  </Stack>
                </Stack>

                <Typography
                  level="body-sm"
                  sx={{
                    pt: 0.5,
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
                <Stack direction="row" spacing={1.25} justifyContent="flex-end">
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
