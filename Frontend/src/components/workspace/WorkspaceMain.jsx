import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { showErrorAlert, showSuccessAlert } from "../../services/alert.service";
import {
  createWorkspace,
  deleteWorkspace,
  fetchWorkspaces,
  updateWorkspace,
} from "../../services/workspace.service";
import { buildWorkspaceProjectsRoute } from "../../router/authRoutes";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import EditWorkspaceModal from "./EditWorkspaceModal";
import DeleteWorkspaceModal from "./DeleteWorkspaceModal";
import {
  DeleteIcon,
  EditIcon,
  EnterIcon,
  PlusIcon,
  WorkspaceIcon,
} from "./WorkspaceIcons";
import { useNavigate } from "react-router-dom";

export default function WorkspaceMain() {
  const navigate = useNavigate();
  const { authSession } = useAuthContext();
  const hasShownLoadErrorRef = useRef(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [createValues, setCreateValues] = useState({
    workspaceName: "",
    workspaceDescription: "",
  });
  const [editValues, setEditValues] = useState({
    workspaceName: "",
    workspaceDescription: "",
  });

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!authSession?.token) {
        setIsLoadingWorkspaces(false);
        return;
      }

      setIsLoadingWorkspaces(true);

      try {
        const result = await fetchWorkspaces(authSession.token);
        setWorkspaces(Array.isArray(result?.workspaces) ? result.workspaces : []);
        hasShownLoadErrorRef.current = false;
      } catch (error) {
        setWorkspaces([]);

        if (!hasShownLoadErrorRef.current) {
          hasShownLoadErrorRef.current = true;
          await showErrorAlert(
            "Unable to load workspaces",
            error.message || "Something went wrong while loading workspaces."
          );
        }
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    loadWorkspaces();
  }, [authSession?.token]);

  const handleCreateFieldChange = (field, value) => {
    setCreateValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleEditFieldChange = (field, value) => {
    setEditValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleCloseCreateModal = () => {
    if (isCreatingWorkspace) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateValues({
      workspaceName: "",
      workspaceDescription: "",
    });
  };

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();

    if (!createValues.workspaceName.trim()) {
      await showErrorAlert("Workspace name required", "Please enter a workspace name.");
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Session expired", "Please sign in again to continue.");
      return;
    }

    setIsCreatingWorkspace(true);

    try {
      const result = await createWorkspace(
        {
          workspaceName: createValues.workspaceName.trim(),
          workspaceDescription: createValues.workspaceDescription.trim(),
        },
        authSession.token
      );

      setIsCreateModalOpen(false);
      setCreateValues({
        workspaceName: "",
        workspaceDescription: "",
      });
      setWorkspaces((currentWorkspaces) => [result.workspace, ...currentWorkspaces]);

      await showSuccessAlert(
        "Workspace created",
        result?.message || "Your workspace has been created successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to create workspace",
        error.message || "Something went wrong while creating the workspace."
      );
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleOpenEditModal = (workspace) => {
    setSelectedWorkspace(workspace);
    setEditValues({
      workspaceName: workspace.workspaceName || "",
      workspaceDescription: workspace.workspaceDescription || "",
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isUpdatingWorkspace) {
      return;
    }

    setIsEditModalOpen(false);
    setSelectedWorkspace(null);
    setEditValues({
      workspaceName: "",
      workspaceDescription: "",
    });
  };

  const handleUpdateWorkspace = async (event) => {
    event.preventDefault();

    if (!editValues.workspaceName.trim()) {
      await showErrorAlert("Workspace name required", "Please enter a workspace name.");
      return;
    }

    if (!selectedWorkspace?.id) {
      await showErrorAlert("Workspace missing", "Please select a workspace to update.");
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Session expired", "Please sign in again to continue.");
      return;
    }

    setIsUpdatingWorkspace(true);

    try {
      const result = await updateWorkspace(
        selectedWorkspace.id,
        {
          workspaceName: editValues.workspaceName.trim(),
          workspaceDescription: editValues.workspaceDescription.trim(),
        },
        authSession.token
      );

      setWorkspaces((currentWorkspaces) =>
        currentWorkspaces.map((workspace) =>
          workspace.id === selectedWorkspace.id ? result.workspace : workspace
        )
      );
      setIsEditModalOpen(false);
      setSelectedWorkspace(null);
      setEditValues({
        workspaceName: "",
        workspaceDescription: "",
      });

      await showSuccessAlert(
        "Workspace updated",
        result?.message || "Your workspace has been updated successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to update workspace",
        error.message || "Something went wrong while updating the workspace."
      );
    } finally {
      setIsUpdatingWorkspace(false);
    }
  };

  const handleOpenDeleteModal = (workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteConfirmText("");
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingWorkspace) {
      return;
    }

    setIsDeleteModalOpen(false);
    setSelectedWorkspace(null);
    setDeleteConfirmText("");
  };

  const handleDeleteWorkspace = async (event) => {
    event.preventDefault();

    if (deleteConfirmText.trim().toLowerCase() !== "delete") {
      await showErrorAlert("Confirmation required", "Please type delete to continue.");
      return;
    }

    if (!selectedWorkspace?.id) {
      await showErrorAlert("Workspace missing", "Please select a workspace to delete.");
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Session expired", "Please sign in again to continue.");
      return;
    }

    setIsDeletingWorkspace(true);

    try {
      const result = await deleteWorkspace(selectedWorkspace.id, authSession.token);

      setWorkspaces((currentWorkspaces) =>
        currentWorkspaces.filter((workspace) => workspace.id !== selectedWorkspace.id)
      );
      setIsDeleteModalOpen(false);
      setSelectedWorkspace(null);
      setDeleteConfirmText("");

      await showSuccessAlert(
        "Workspace deleted",
        result?.message || "Your workspace has been deleted successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to delete workspace",
        error.message || "Something went wrong while deleting the workspace."
      );
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1.5, md: 2 } }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Typography
            level="title-lg"
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--color-font-primary)",
            }}
          >
            Workspaces
          </Typography>

          <Button
            startDecorator={<PlusIcon />}
            onClick={() => setIsCreateModalOpen(true)}
            sx={{
              alignSelf: { xs: "flex-start", sm: "auto" },
              minHeight: "42px",
              color: "var(--color-font-secondary)",
            }}
          >
            Create workspace
          </Button>
        </Stack>

        {isLoadingWorkspaces ? (
          <Sheet
            variant="outlined"
            sx={{
              width: "100%",
              borderRadius: "20px",
              borderColor: "rgba(220, 226, 244, 0.95)",
              backgroundColor: "#fff",
              overflow: "hidden",
            }}
          >
            <LinearProgress />
          </Sheet>
        ) : (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
            {workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <Sheet
                  key={workspace.id}
                  variant="outlined"
                  sx={{
                    width: "100%",
                    maxWidth: "256px",
                    p: 2.25,
                    borderRadius: "20px",
                    borderColor: "rgba(220, 226, 244, 0.95)",
                    backgroundColor: "#fff",
                    boxShadow: "0 18px 38px rgba(170, 180, 214, 0.16)",
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            color: "var(--color-primary)",
                            display: "flex",
                            fontSize: "1rem",
                          }}
                        >
                          <WorkspaceIcon />
                        </Box>
                        <Typography
                          level="title-lg"
                          sx={{ fontWeight: 700, color: "#1e293b", fontSize: "1.05rem" }}
                        >
                          {workspace.workspaceName}
                        </Typography>
                      </Stack>
                      <Chip
                        size="sm"
                        variant="soft"
                        sx={{
                          backgroundColor: "#eef2ff",
                          color: "var(--color-primary)",
                          fontWeight: 700,
                          borderRadius: "999px",
                          minHeight: 28,
                          textTransform: "capitalize",
                        }}
                      >
                        {workspace.membershipRole || "owner"}
                      </Chip>
                    </Stack>

                    <Typography level="body-md" sx={{ color: "#64748b", fontSize: "0.98rem" }}>
                      {workspace.workspaceDescription || "No description added yet."}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="flex-end"
                      alignItems="center"
                    >
                      <Tooltip title="Edit workspace" variant="soft">
                        <IconButton
                          variant="plain"
                          color="neutral"
                          onClick={() => handleOpenEditModal(workspace)}
                          sx={{ color: "#64748b", minWidth: 30, minHeight: 30 }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete workspace" variant="soft">
                        <IconButton
                          variant="plain"
                          color="danger"
                          onClick={() => handleOpenDeleteModal(workspace)}
                          sx={{ minWidth: 30, minHeight: 30 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Enter workspace" variant="soft">
                        <IconButton
                          variant="soft"
                          onClick={() =>
                            navigate(
                              buildWorkspaceProjectsRoute(workspace.slug),
                              {
                                state: {
                                  workspace,
                                },
                              }
                            )
                          }
                          sx={{
                            backgroundColor: "#eef2ff",
                            color: "var(--color-primary)",
                            minWidth: 34,
                            minHeight: 34,
                            borderRadius: "10px",
                          }}
                        >
                          <EnterIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Sheet>
              ))
            ) : (
              <Sheet
                variant="outlined"
                sx={{
                  width: "100%",
                  maxWidth: "320px",
                  p: 2.5,
                  borderRadius: "20px",
                  borderColor: "rgba(220, 226, 244, 0.95)",
                  backgroundColor: "#fff",
                  boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
                }}
              >
                <Stack spacing={1}>
                  <Typography
                    level="title-md"
                    sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
                  >
                    No workspaces yet
                  </Typography>
                  <Typography level="body-sm" sx={{ color: "#64748b" }}>
                    Create your first workspace to start organizing projects.
                  </Typography>
                </Stack>
              </Sheet>
            )}
          </Stack>
        )}
      </Stack>

      <CreateWorkspaceModal
        open={isCreateModalOpen}
        values={createValues}
        loading={isCreatingWorkspace}
        onClose={handleCloseCreateModal}
        onChange={handleCreateFieldChange}
        onSubmit={handleCreateWorkspace}
      />

      <EditWorkspaceModal
        open={isEditModalOpen}
        values={editValues}
        loading={isUpdatingWorkspace}
        onClose={handleCloseEditModal}
        onChange={handleEditFieldChange}
        onSubmit={handleUpdateWorkspace}
      />

      <DeleteWorkspaceModal
        open={isDeleteModalOpen}
        workspaceName={selectedWorkspace?.workspaceName || "this workspace"}
        confirmText={deleteConfirmText}
        loading={isDeletingWorkspace}
        onClose={handleCloseDeleteModal}
        onChange={setDeleteConfirmText}
        onSubmit={handleDeleteWorkspace}
      />
    </Box>
  );
}
