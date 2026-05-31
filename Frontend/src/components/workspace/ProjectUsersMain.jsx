import KeyboardArrowLeftRounded from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRounded from "@mui/icons-material/KeyboardArrowRightRounded";
import {
  Avatar,
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
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { APP_ROUTES } from "../../router/authRoutes";
import {
  showAccessDeniedAlert,
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../services/alert.service";
import {
  addProjectUser,
  deleteProjectUser,
  fetchProjectUsers,
  updateProjectUser,
} from "../../services/project.service";
import { fetchAllWorkspaceUsers } from "../../services/workspace.service";
import AddProjectUserModal from "./AddProjectUserModal";
import EditProjectUserModal from "./EditProjectUserModal";
import { DeleteIcon, EditIcon, PlusIcon, SearchIcon } from "./WorkspaceIcons";

const roleChipStyles = {
  owner: { backgroundColor: "#eef2ff", color: "#3155ff" },
  admin: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  member: { backgroundColor: "#f5f7ff", color: "#5c6d90" },
};

const statusChipStyles = {
  active: { backgroundColor: "#e9f8ef", color: "#1d8f5a" },
  inactive: { backgroundColor: "#fff1f1", color: "#d14343" },
};

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

const buildUserFullName = (user = {}) =>
  `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim();

export default function ProjectUsersMain({
  project = null,
  projectTitle = "Project",
  workspace = null,
}) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const currentUserId = authSession?.user?.id ? Number(authSession.user.id) : null;
  const workspaceMembershipRole = String(workspace?.membershipRole || "")
    .trim()
    .toLowerCase();
  const isWorkspaceOwnerOrAdmin =
    workspaceMembershipRole === "owner" || workspaceMembershipRole === "admin";
  const isProjectOwner =
    String(project?.membershipRole || "")
      .trim()
      .toLowerCase() === "owner";
  const canManageProjectUsers = isWorkspaceOwnerOrAdmin || isProjectOwner;
  const [users, setUsers] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmittingAddUser, setIsSubmittingAddUser] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);
  const [editingProjectUserId, setEditingProjectUserId] = useState(null);
  const [editUserValues, setEditUserValues] = useState({
    role: "member",
    status: "active",
  });
  const [deletingProjectUserIds, setDeletingProjectUserIds] = useState([]);
  const [addUserValues, setAddUserValues] = useState({
    mode: "existing_workspace_user",
    userId: "",
    name: "",
    email: "",
    phone: "",
    role: "member",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim().toLowerCase());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchValue, rowsPerPage]);

  useEffect(() => {
    const loadProjectUsers = async () => {
      if (!authSession?.token || !project?.id) {
        setUsers([]);
        setWorkspaceUsers([]);
        setIsLoadingUsers(false);
        return;
      }

      setIsLoadingUsers(true);

      try {
        const [projectUsersResult, availableWorkspaceUsers] = await Promise.all([
          fetchProjectUsers(project.id, authSession.token),
          workspace?.id
            ? fetchAllWorkspaceUsers(workspace.id, authSession.token)
            : Promise.resolve([]),
        ]);
        setUsers(Array.isArray(projectUsersResult?.users) ? projectUsersResult.users : []);
        setWorkspaceUsers(Array.isArray(availableWorkspaceUsers) ? availableWorkspaceUsers : []);
      } catch (error) {
        setUsers([]);
        setWorkspaceUsers([]);

        if (shouldRedirectToWorkspace(error)) {
          await showAccessDeniedAlert();
          navigate(APP_ROUTES.workspace, { replace: true });
          return;
        }

        await showErrorAlert(
          "Unable to load project users",
          error.message || "Something went wrong while loading project users."
        );
      } finally {
        setIsLoadingUsers(false);
      }
    };

    void loadProjectUsers();
  }, [authSession?.token, navigate, project?.id, workspace?.id]);

  const availableWorkspaceUsers = useMemo(() => {
    const existingProjectUserIds = new Set(
      users.map((projectUser) => Number(projectUser.user?.id || projectUser.userId))
    );

    return workspaceUsers.filter((workspaceUser) => {
      const isActive = String(workspaceUser.workspaceStatus || "").toLowerCase() === "active";
      return isActive && !existingProjectUserIds.has(Number(workspaceUser.id));
    });
  }, [users, workspaceUsers]);

  const handleAddUserFieldChange = (field, value) => {
    setAddUserValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [field]: value,
      };

      if (field === "mode" && value === "existing_workspace_user") {
        nextValues.name = "";
        nextValues.email = "";
        nextValues.phone = "";
      }

      if (field === "mode" && value === "invite_user") {
        nextValues.userId = "";
      }

      return nextValues;
    });
  };

  const handleCloseAddUserModal = () => {
    if (isSubmittingAddUser) {
      return;
    }

    setIsAddUserModalOpen(false);
    setAddUserValues({
      mode: "existing_workspace_user",
      userId: "",
      name: "",
      email: "",
      phone: "",
      role: "member",
    });
  };

  const handleOpenEditUserModal = (projectUser) => {
    if (!projectUser?.userId && !projectUser?.user?.id) {
      return;
    }

    setEditingProjectUserId(Number(projectUser.user?.id || projectUser.userId));
    setEditUserValues({
      role: String(projectUser.role || "member").toLowerCase(),
      status: String(projectUser.status || "active").toLowerCase(),
    });
    setIsEditUserModalOpen(true);
  };

  const handleCloseEditUserModal = () => {
    if (isSubmittingEditUser) {
      return;
    }

    setIsEditUserModalOpen(false);
    setEditingProjectUserId(null);
    setEditUserValues({
      role: "member",
      status: "active",
    });
  };

  const handleEditUserFieldChange = (field, value) => {
    setEditUserValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleAddUser = async (event) => {
    event.preventDefault();

    if (!authSession?.token || !project?.id) {
      await showErrorAlert("Project unavailable", "We could not resolve the current project.");
      return;
    }

    if (!addUserValues.role.trim()) {
      await showErrorAlert("Missing details", "Please choose a project role.");
      return;
    }

    if (
      addUserValues.mode === "existing_workspace_user" &&
      !String(addUserValues.userId || "").trim()
    ) {
      await showErrorAlert("Missing details", "Please select a workspace user.");
      return;
    }

    if (
      addUserValues.mode === "invite_user" &&
      (!addUserValues.name.trim() || !addUserValues.email.trim())
    ) {
      await showErrorAlert("Missing details", "Please complete the invite fields.");
      return;
    }

    setIsSubmittingAddUser(true);

    try {
      const payload =
        addUserValues.mode === "existing_workspace_user"
          ? {
              mode: "existing_workspace_user",
              userId: Number(addUserValues.userId),
              role: addUserValues.role.trim(),
            }
          : {
              mode: "invite_user",
              name: addUserValues.name.trim(),
              email: addUserValues.email.trim(),
              phone: addUserValues.phone.trim(),
              role: addUserValues.role.trim(),
            };

      const result = await addProjectUser(project.id, payload, authSession.token);
      const refreshedUsers = await fetchProjectUsers(project.id, authSession.token);
      setUsers(Array.isArray(refreshedUsers?.users) ? refreshedUsers.users : []);

      if (workspace?.id) {
        const refreshedWorkspaceUsers = await fetchAllWorkspaceUsers(workspace.id, authSession.token);
        setWorkspaceUsers(Array.isArray(refreshedWorkspaceUsers) ? refreshedWorkspaceUsers : []);
      }

      await showSuccessAlert(
        "User added",
        result?.createdNewUser && result?.temporaryPassword
          ? `The user was invited and added to the project. Temporary password: ${result.temporaryPassword}`
          : result?.message || "The user has been added to the project successfully."
      );
      handleCloseAddUserModal();
    } catch (error) {
      await showErrorAlert(
        "Unable to add user",
        error.message || "Something went wrong while adding the project user."
      );
    } finally {
      setIsSubmittingAddUser(false);
    }
  };

  const handleEditUser = async (event) => {
    event.preventDefault();

    if (!authSession?.token || !project?.id || !editingProjectUserId) {
      await showErrorAlert("Project unavailable", "We could not resolve the current project user.");
      return;
    }

    if (!editUserValues.role.trim() || !editUserValues.status.trim()) {
      await showErrorAlert("Missing details", "Please complete the project user details.");
      return;
    }

    setIsSubmittingEditUser(true);

    try {
      const result = await updateProjectUser(
        project.id,
        editingProjectUserId,
        {
          role: editUserValues.role.trim(),
          status: editUserValues.status.trim(),
        },
        authSession.token
      );

      setUsers((currentUsers) =>
        currentUsers.map((projectUser) =>
          Number(projectUser.user?.id || projectUser.userId) === editingProjectUserId
            ? result.user
            : projectUser
        )
      );

      await showSuccessAlert(
        "User updated",
        result?.message || "The project user has been updated successfully."
      );
      handleCloseEditUserModal();
    } catch (error) {
      await showErrorAlert(
        "Unable to update user",
        error.message || "Something went wrong while updating the project user."
      );
    } finally {
      setIsSubmittingEditUser(false);
    }
  };

  const handleDeleteUser = async (projectUser) => {
    const targetUserId = Number(projectUser?.user?.id || projectUser?.userId);

    if (!authSession?.token || !project?.id || !targetUserId) {
      return;
    }

    const confirmation = await showConfirmAlert(
      "Remove user?",
      `This will remove ${buildUserFullName(projectUser.user || {})} from the project.`,
      {
        confirmButtonText: "Remove",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingProjectUserIds((currentIds) => [...currentIds, targetUserId]);

    try {
      const result = await deleteProjectUser(project.id, targetUserId, authSession.token);
      setUsers((currentUsers) =>
        currentUsers.filter(
          (currentUser) =>
            Number(currentUser.user?.id || currentUser.userId) !== targetUserId
        )
      );

      await showSuccessAlert(
        "User removed",
        result?.message || "The project user has been removed successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to remove user",
        error.message || "Something went wrong while removing the project user."
      );
    } finally {
      setDeletingProjectUserIds((currentIds) =>
        currentIds.filter((id) => id !== targetUserId)
      );
    }
  };

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchValue) {
      return users;
    }

    return users.filter((projectUser) => {
      const fullName = buildUserFullName(projectUser.user || {}).toLowerCase();
      const email = String(projectUser.user?.email || "").toLowerCase();
      const role = String(projectUser.role || "").toLowerCase();
      const status = String(projectUser.status || "").toLowerCase();

      return (
        fullName.includes(debouncedSearchValue) ||
        email.includes(debouncedSearchValue) ||
        role.includes(debouncedSearchValue) ||
        status.includes(debouncedSearchValue)
      );
    });
  }, [debouncedSearchValue, users]);

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalUsers === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + rowsPerPage);
  const pageEndIndex = totalUsers === 0 ? 0 : Math.min(pageStartIndex + paginatedUsers.length, totalUsers);

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set([1, totalPages, safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1]);

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((leftPage, rightPage) => leftPage - rightPage);
  }, [safeCurrentPage, totalPages]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

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
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", lg: "center" }}
          sx={{ px: 2.5, py: 2.5 }}
        >
          <Stack spacing={0.5}>
            <Typography
              level="title-lg"
              sx={{ fontWeight: 700, color: "var(--color-font-primary)", fontSize: "1.2rem" }}
            >
              Users
            </Typography>
            <Typography level="body-sm" sx={{ color: "#5c6d90", maxWidth: 540 }}>
              View the users assigned to {projectTitle}.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", lg: "auto" } }}>
            <Button
              startDecorator={<PlusIcon />}
              disabled={!canManageProjectUsers}
              onClick={() => setIsAddUserModalOpen(true)}
              sx={{
                whiteSpace: "nowrap",
                borderRadius: "12px",
                color: "var(--color-font-secondary)",
              }}
            >
              Add User
            </Button>
            <Input
              startDecorator={<SearchIcon />}
              placeholder="Search users"
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setCurrentPage(1);
              }}
              sx={{
                minWidth: { xs: "100%", sm: 280 },
                maxWidth: 320,
                borderRadius: "12px",
                backgroundColor: "#fff",
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.06)",
                "--Input-placeholderColor": "#97a3b6",
                "--Input-focusedHighlight": "rgba(49, 85, 255, 0.18)",
              }}
            />
          </Stack>
        </Stack>

        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            borderTop: "1px solid rgba(223, 228, 243, 0.9)",
            backgroundColor: "#fbfcff",
          }}
        >
          {isLoadingUsers ? (
            <Sheet sx={{ backgroundColor: "#fff" }}>
              <LinearProgress />
            </Sheet>
          ) : (
            <Table
              borderAxis="xBetween"
              sx={{
                minWidth: 860,
                "--TableCell-headBackground": "#f5f7ff",
                "--TableCell-selectedBackground": "transparent",
                "& thead th": {
                  py: 1.35,
                  px: 2.25,
                  color: "#60708e",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  backgroundColor: "#f5f7ff",
                  borderBottom: "1px solid rgba(223, 228, 243, 0.9)",
                },
                "& tbody td": {
                  py: 1.3,
                  px: 2.25,
                  color: "var(--color-font-primary)",
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid rgba(236, 240, 249, 0.9)",
                  verticalAlign: "middle",
                },
                "& tbody tr:hover td": {
                  backgroundColor: "#f9fbff",
                },
                "& tbody td:last-of-type, & thead th:last-of-type": {
                  textAlign: "center",
                },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: "72px" }}>ID</th>
                  <th style={{ width: "280px", minWidth: "280px" }}>User</th>
                  <th style={{ width: "280px", minWidth: "280px" }}>Email</th>
                  <th style={{ width: "170px", minWidth: "170px" }}>Role</th>
                  <th style={{ width: "140px", minWidth: "140px" }}>Status</th>
                  <th style={{ width: "130px", minWidth: "130px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((projectUser) => {
                  const user = projectUser.user || {};
                  const fullName = buildUserFullName(user);
                  const initial = String(user.firstName || "U").charAt(0).toUpperCase();
                  const role = String(projectUser.role || "member").toLowerCase();
                  const status = String(projectUser.status || "active").toLowerCase();
                  const userId = Number(user.id || projectUser.userId);
                  const isOwner = role === "owner";
                  const isCurrentUser = userId === currentUserId;

                  return (
                    <tr key={projectUser.id}>
                      <td>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          {user.id || projectUser.userId}
                        </Typography>
                      </td>
                      <td>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            size="md"
                            sx={{
                              width: 44,
                              height: 44,
                              backgroundColor: "#eef2ff",
                              color: "#3155ff",
                              fontWeight: 700,
                            }}
                          >
                            {initial}
                          </Avatar>
                          <Stack spacing={0.25}>
                            <Typography sx={{ fontWeight: 600, color: "#1f2a44" }}>
                              {fullName || `User ${user.id || projectUser.userId}`}
                            </Typography>
                          </Stack>
                        </Stack>
                      </td>
                      <td>
                        <Typography sx={{ color: "#1f2a44", whiteSpace: "nowrap" }}>
                          {user.email || "-"}
                        </Typography>
                      </td>
                      <td>
                        <Chip
                          size="sm"
                          variant="soft"
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 700,
                            px: 1.2,
                            ...(roleChipStyles[role] || roleChipStyles.member),
                          }}
                        >
                          {projectUser.role}
                        </Chip>
                      </td>
                      <td>
                        <Chip
                          size="sm"
                          variant="soft"
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 700,
                            px: 1.2,
                            ...(statusChipStyles[status] || statusChipStyles.active),
                          }}
                        >
                          {projectUser.status}
                        </Chip>
                      </td>
                      <td>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            variant="plain"
                            sx={{ color: "#3155ff" }}
                            disabled={!canManageProjectUsers}
                            onClick={() => handleOpenEditUserModal(projectUser)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            variant="plain"
                            color="danger"
                            disabled={
                              !canManageProjectUsers ||
                              deletingProjectUserIds.includes(userId) ||
                              isCurrentUser ||
                              isOwner
                            }
                            loading={deletingProjectUserIds.includes(userId)}
                            onClick={() => {
                              void handleDeleteUser(projectUser);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  );
                })}
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <Stack alignItems="center" spacing={0.75} sx={{ py: 5 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          No users found
                        </Typography>
                        <Typography level="body-sm" sx={{ color: "#7b8596", textAlign: "center" }}>
                          Try a different name, role, or email.
                        </Typography>
                      </Stack>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          )}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{
            px: 2.25,
            py: 1.75,
            borderTop: "1px solid rgba(223, 228, 243, 0.9)",
            backgroundColor: "#ffffff",
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography level="body-sm" sx={{ color: "#60708e" }}>
              Rows per page
            </Typography>
            <Select
              value={rowsPerPage}
              size="sm"
              onChange={(_, value) => {
                if (value) {
                  setRowsPerPage(value);
                  setCurrentPage(1);
                }
              }}
              sx={{
                minWidth: 72,
                borderRadius: "8px",
                "--Select-focusedHighlight": "rgba(49, 85, 255, 0.18)",
              }}
            >
              <Option value={5}>5</Option>
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
            </Select>
            <Typography level="body-sm" sx={{ color: "#60708e" }}>
              {totalUsers > 0 ? `${pageStartIndex + 1}-${pageEndIndex} of ${totalUsers}` : "0 of 0"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
            <IconButton
              variant="plain"
              color="neutral"
              disabled={safeCurrentPage === 1 || totalUsers === 0}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              sx={{ color: "#a0a9b9", borderRadius: "8px" }}
            >
              <KeyboardArrowLeftRounded />
            </IconButton>
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
                  <IconButton
                    variant={pageNumber === safeCurrentPage ? "soft" : "plain"}
                    onClick={() => setCurrentPage(pageNumber)}
                    sx={{
                      minWidth: 36,
                      height: 34,
                      borderRadius: "8px",
                      backgroundColor:
                        pageNumber === safeCurrentPage ? "#e6ecff" : "transparent",
                      color: pageNumber === safeCurrentPage ? "#3155ff" : "#60708e",
                      fontWeight: 700,
                    }}
                  >
                    {pageNumber}
                  </IconButton>
                </Stack>
              );
            })}
            <IconButton
              variant="plain"
              color="neutral"
              disabled={safeCurrentPage === totalPages || totalUsers === 0}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              sx={{ color: "#7b8596", borderRadius: "8px" }}
            >
              <KeyboardArrowRightRounded />
            </IconButton>
          </Stack>
        </Stack>
      </Stack>
      <AddProjectUserModal
        open={isAddUserModalOpen}
        values={addUserValues}
        workspaceUsers={availableWorkspaceUsers}
        loading={isSubmittingAddUser}
        onClose={handleCloseAddUserModal}
        onChange={handleAddUserFieldChange}
        onSubmit={handleAddUser}
      />
      <EditProjectUserModal
        open={isEditUserModalOpen}
        values={editUserValues}
        disableRoleChange={
          editUserValues.role === "owner" || Number(editingProjectUserId) === currentUserId
        }
        loading={isSubmittingEditUser}
        onClose={handleCloseEditUserModal}
        onChange={handleEditUserFieldChange}
        onSubmit={handleEditUser}
      />
    </Sheet>
  );
}
