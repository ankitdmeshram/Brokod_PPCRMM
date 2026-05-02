import {
  Box,
  Button,
  Chip,
  IconButton,
  Input,
  LinearProgress,
  Option,
  Select,
  Sheet,
  Stack,
  Table,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../services/alert.service";
import {
  buildProjectTasksRoute,
} from "../../router/authRoutes";
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
} from "../../services/project.service";
import {
  DeleteIcon,
  EditIcon,
  EnterIcon,
  PlusIcon,
  SearchIcon,
} from "./WorkspaceIcons";
import CreateProjectModal from "./CreateProjectModal";
import EditProjectModal from "./EditProjectModal";

const statusStyles = {
  Planned: { backgroundColor: "#eef2ff", color: "#3155ff" },
  "In Progress": { backgroundColor: "#e8edff", color: "#3155ff" },
  "On Hold": { backgroundColor: "#eef2ff", color: "#3155ff" },
  Completed: { backgroundColor: "#e9efff", color: "#3155ff" },
  Cancelled: { backgroundColor: "#eef2ff", color: "#3155ff" },
};

const formatStatusLabel = (status = "") =>
  String(status)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateLabel = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const initialProjectFormValues = {
  projectName: "",
  status: "planned",
  startDate: "",
  endDate: "",
  tags: [],
  description: "",
};

export default function ProjectsMain({ workspace, workspaceTitle, mode = "workspace" }) {
  const navigate = useNavigate();
  const { authSession } = useAuthContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [projects, setProjects] = useState([]);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [createValues, setCreateValues] = useState(initialProjectFormValues);
  const [editValues, setEditValues] = useState(initialProjectFormValues);

  const currentUserId = Number(authSession?.user?.id);
  const isSuperAdminView = mode === "super-admin";
  const currentUserName = useMemo(
    () => `${authSession?.user?.firstName || ""} ${authSession?.user?.lastName || ""}`.trim(),
    [authSession?.user?.firstName, authSession?.user?.lastName]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchValue, rowsPerPage]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!authSession?.token || (!isSuperAdminView && !workspace?.id)) {
        setProjects([]);
        setTotalProjects(0);
        setTotalPages(1);
        setIsLoadingProjects(false);
        return;
      }

      setIsLoadingProjects(true);

      try {
        const result = await fetchProjects(authSession.token, {
          workspaceId: isSuperAdminView ? null : workspace.id,
          search: debouncedSearchValue,
          page: currentPage,
          limit: rowsPerPage,
        });
        if (!isCancelled) {
          setProjects(Array.isArray(result?.projects) ? result.projects : []);
          setTotalProjects(Number(result?.pagination?.total || 0));
          setTotalPages(Number(result?.pagination?.totalPages || 1));
        }
      } catch (error) {
        if (!isCancelled) {
          setProjects([]);
          setTotalProjects(0);
          setTotalPages(1);
          await showErrorAlert(
            "Unable to load projects",
            error.message || "Something went wrong while loading projects."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProjects(false);
        }
      }
    };

    let isCancelled = false;

    void loadProjects();

    return () => {
      isCancelled = true;
    };
  }, [
    authSession?.token,
    currentPage,
    debouncedSearchValue,
    isSuperAdminView,
    projectRefreshKey,
    rowsPerPage,
    workspace?.id,
  ]);

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const projectRows = useMemo(
    () =>
      projects.map((project) => ({
        projectId: project.id,
        id: `PRJ-${project.id}`,
        projectName: project.projectName,
        owner:
          Number(project.projectOwner) === currentUserId
            ? currentUserName
            : `User #${project.projectOwner}`,
        status: formatStatusLabel(project.status),
        startDate: formatDateLabel(project.startDate),
        endDate: formatDateLabel(project.endDate),
        tags: Array.isArray(project.tags) ? project.tags : [],
        description: project.description || "",
        workspaceSlug: project.workspaceSlug || "",
        workspaceName:
          project.workspaceName ||
          (project.workspaceId ? `Workspace #${project.workspaceId}` : "-"),
      })),
    [currentUserId, currentUserName, projects]
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalProjects === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const paginatedProjectRows = projectRows;
  const pageEndIndex =
    totalProjects === 0 ? 0 : Math.min(pageStartIndex + rowsPerPage, totalProjects);

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
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const handleFieldChange = useCallback((field, value) => {
    setCreateValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }, []);

  const handleCloseCreateModal = useCallback((forceClose = false) => {
    if (isCreatingProject && !forceClose) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateValues(initialProjectFormValues);
  }, [isCreatingProject]);

  const handleEditFieldChange = useCallback((field, value) => {
    setEditValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }, []);

  const handleOpenEditModal = useCallback((projectId) => {
    const project = projectsById.get(projectId);

    if (!project) {
      void showErrorAlert("Project missing", "Please refresh the page and try again.");
      return;
    }

    setEditingProjectId(project.id);
    setEditValues({
      projectName: project.projectName || "",
      status: project.status || "planned",
      startDate: formatDateInputValue(project.startDate),
      endDate: formatDateInputValue(project.endDate),
      tags: Array.isArray(project.tags) ? project.tags : [],
      description: project.description || "",
    });
    setIsEditModalOpen(true);
  }, [projectsById]);

  const handleCloseEditModal = useCallback((forceClose = false) => {
    if (isUpdatingProject && !forceClose) {
      return;
    }

    setIsEditModalOpen(false);
    setEditingProjectId(null);
    setEditValues(initialProjectFormValues);
  }, [isUpdatingProject]);

  const handleEnterProject = useCallback(
    (projectId) => {
      const project = projectsById.get(projectId);

      const workspaceSlug = workspace?.slug || project?.workspaceSlug;

      if (!project || !workspaceSlug) {
        void showErrorAlert("Project missing", "Please refresh the page and try again.");
        return;
      }

      navigate(
        buildProjectTasksRoute(
          workspaceSlug,
          project.slug
        ),
        {
          state: {
            workspace,
            project,
          },
        }
      );
    },
    [navigate, projectsById, workspace]
  );

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!workspace?.id) {
      await showErrorAlert("Workspace missing", "Please reload the workspace and try again.");
      return;
    }

    if (!createValues.projectName.trim()) {
      await showErrorAlert("Project name required", "Please enter a project name.");
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Session expired", "Please sign in again to continue.");
      return;
    }

    setIsCreatingProject(true);

    try {
      const result = await createProject(
        {
          workspaceId: workspace.id,
          projectName: createValues.projectName.trim(),
          description: createValues.description.trim(),
          status: createValues.status,
          startDate: createValues.startDate || null,
          endDate: createValues.endDate || null,
          tags: createValues.tags,
        },
        authSession.token
      );

      setIsCreatingProject(false);
      handleCloseCreateModal(true);
      setCurrentPage(1);
      setProjectRefreshKey((currentKey) => currentKey + 1);

      await showSuccessAlert(
        "Project created",
        result?.message || "Your project has been created successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to create project",
        error.message || "Something went wrong while creating the project."
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!project?.projectId) {
      await showErrorAlert("Project missing", "Please refresh the page and try again.");
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Session expired", "Please sign in again to continue.");
      return;
    }

    const confirmation = await showConfirmAlert(
      "Delete project?",
      `This will permanently delete ${project.projectName}.`
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingProjectId(project.projectId);

    try {
      const result = await deleteProject(project.projectId, authSession.token);

      if (paginatedProjectRows.length === 1 && currentPage > 1) {
        setCurrentPage((page) => Math.max(1, page - 1));
      } else {
        setProjectRefreshKey((currentKey) => currentKey + 1);
      }

      await showSuccessAlert(
        "Project deleted",
        result?.message || "The project has been deleted successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to delete project",
        error.message || "Something went wrong while deleting the project."
      );
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleUpdateProject = async (event) => {
    event.preventDefault();

    if (!editingProjectId) {
      await showErrorAlert("Project missing", "Please refresh the page and try again.");
      return;
    }

    if (!editValues.projectName.trim()) {
      await showErrorAlert("Project name required", "Please enter a project name.");
      return;
    }

    if (!authSession?.token) {
      await showErrorAlert("Session expired", "Please sign in again to continue.");
      return;
    }

    setIsUpdatingProject(true);

    try {
      const result = await updateProject(
        editingProjectId,
        {
          projectName: editValues.projectName.trim(),
          description: editValues.description.trim(),
          status: editValues.status,
          startDate: editValues.startDate || null,
          endDate: editValues.endDate || null,
          tags: editValues.tags,
        },
        authSession.token
      );

      handleCloseEditModal(true);
      setProjectRefreshKey((currentKey) => currentKey + 1);

      await showSuccessAlert(
        "Project updated",
        result?.message || "Your project has been updated successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to update project",
        error.message || "Something went wrong while updating the project."
      );
    } finally {
      setIsUpdatingProject(false);
    }
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
                Projects
              </Typography>
                <Typography level="body-sm" sx={{ color: "#5c6d90", maxWidth: 520 }}>
                {isSuperAdminView
                  ? "Review projects across workspaces from one place."
                  : "Manage active work, owners, delivery timelines, and project actions from one place."}
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ minWidth: 0 }}>
              <Input
                startDecorator={<SearchIcon />}
                placeholder={
                  isSuperAdminView
                    ? "Search by ID, project, owner, workspace, or tag"
                    : "Search by ID, project, owner, or tag"
                }
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                sx={{
                  minWidth: { xs: "100%", sm: 280 },
                  borderRadius: "14px",
                }}
              />
              {!isSuperAdminView ? (
                <Button
                  startDecorator={<PlusIcon />}
                  disabled={!workspace?.id}
                  onClick={() => setIsCreateModalOpen(true)}
                  sx={{
                    minHeight: "42px",
                    color: "var(--color-font-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Create Project
                </Button>
              ) : null}
            </Stack>
          </Stack>

          {isLoadingProjects ? (
            <Sheet
              sx={{
                borderTop: "1px solid rgba(223, 228, 243, 0.9)",
                backgroundColor: "#fff",
              }}
            >
              <LinearProgress />
            </Sheet>
          ) : (
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
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    backgroundColor: "#fff",
                  },
                  "& thead th:nth-of-type(2)": {
                    position: "sticky",
                    left: "88px",
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
                    left: "88px",
                    zIndex: 2,
                    backgroundColor: "#fff",
                    boxShadow: "inset -1px 0 0 rgba(236, 240, 249, 0.95)",
                },
                "& tbody td": {
                  py: 1.3,
                  px: 2,
                  color: "var(--color-font-primary)",
                  borderBottom: "1px solid rgba(236, 240, 249, 0.9)",
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
                    <th style={{ width: "88px" }}>ID</th>
                    <th style={{ width: "270px", minWidth: "270px" }}>Project Name</th>
                    <th style={{ width: "180px", minWidth: "180px" }}>Owner</th>
                    {isSuperAdminView ? (
                      <th style={{ width: "180px", minWidth: "180px" }}>Workspace</th>
                    ) : null}
                    <th style={{ width: "150px", minWidth: "150px" }}>Status</th>
                    <th style={{ width: "150px", minWidth: "150px" }}>Start Date</th>
                    <th style={{ width: "150px", minWidth: "150px" }}>End Date</th>
                    <th style={{ width: "220px", minWidth: "220px" }}>Tags</th>
                    <th style={{ width: "160px", minWidth: "160px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjectRows.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Typography sx={{ color: "#3155ff", fontWeight: 700 }}>
                          {project.id}
                        </Typography>
                      </td>
                      <td>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ width: "100%" }}
                        >
                          <Typography
                            onClick={() => handleEnterProject(project.projectId)}
                            sx={{
                              fontWeight: 700,
                              color: "#4b5563",
                              cursor: "pointer",
                              transition: "color 0.2s ease",
                              "&:hover": {
                                color: "#3155ff",
                              },
                            }}
                          >
                            {project.projectName}
                          </Typography>
                          <Tooltip title="Enter project" variant="soft">
                            <IconButton
                              variant="soft"
                              size="sm"
                              onClick={() => handleEnterProject(project.projectId)}
                              sx={{
                                opacity: 0,
                                transform: "translateX(-6px)",
                                transition: "opacity 0.2s ease, transform 0.2s ease",
                                backgroundColor: "#eef2ff",
                                color: "#3155ff",
                                borderRadius: "10px",
                                "tr:hover &": {
                                  opacity: 1,
                                  transform: "translateX(0)",
                                },
                              }}
                            >
                              <EnterIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </td>
                      <td>{project.owner}</td>
                      {isSuperAdminView ? <td>{project.workspaceName}</td> : null}
                      <td>
                        <Chip
                          size="sm"
                          variant="soft"
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 600,
                            ...statusStyles[project.status],
                          }}
                        >
                          {project.status}
                        </Chip>
                      </td>
                      <td>{project.startDate}</td>
                      <td>{project.endDate}</td>
                      <td>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {project.tags.map((tag) => (
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
                      <td>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            opacity: 0.72,
                            transition: "opacity 0.2s ease",
                            "tr:hover &": {
                              opacity: 1,
                            },
                          }}
                        >
                          <IconButton
                            variant="plain"
                            sx={{ color: "#3155ff" }}
                            onClick={() => handleOpenEditModal(project.projectId)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            variant="plain"
                            color="danger"
                            disabled={deletingProjectId === project.projectId}
                            onClick={() => handleDeleteProject(project)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Box>
          )}

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
                <Option value={100}>100</Option>
              </Select>
              <Typography level="body-sm" sx={{ color: "#60708e" }}>
                {totalProjects > 0
                  ? `${pageStartIndex + 1}-${pageEndIndex} of ${totalProjects}`
                  : "0 of 0"}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
              <Button
                variant="plain"
                color="neutral"
                disabled={safeCurrentPage === 1 || totalProjects === 0}
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
                disabled={safeCurrentPage === totalPages || totalProjects === 0}
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

      {!isSuperAdminView ? (
        <CreateProjectModal
          open={isCreateModalOpen}
          values={createValues}
          workspaceTitle={workspaceTitle}
          loading={isCreatingProject}
          onClose={handleCloseCreateModal}
          onChange={handleFieldChange}
          onSubmit={handleCreateProject}
        />
      ) : null}
      <EditProjectModal
        open={isEditModalOpen}
        values={editValues}
        workspaceTitle={workspaceTitle}
        loading={isUpdatingProject}
        onClose={handleCloseEditModal}
        onChange={handleEditFieldChange}
        onSubmit={handleUpdateProject}
      />
    </Box>
  );
}
