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
  Switch,
  Table,
  Typography,
} from "@mui/joy";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  deleteWorkspaceUser,
  fetchWorkspaceUsers,
  inviteWorkspaceUser,
  updateWorkspaceUser,
  updateWorkspaceUserStatus,
} from "../../services/workspace.service";
import InviteWorkspaceUserModal from "./InviteWorkspaceUserModal";
import { DeleteIcon, PlusIcon, SearchIcon } from "./WorkspaceIcons";

const buildUserFullName = (user = {}) =>
  `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim();

const roleChipStyles = {
  owner: { backgroundColor: "#eef2ff", color: "#3155ff" },
  admin: { backgroundColor: "#eef6ff", color: "#2f6adf" },
  member: { backgroundColor: "#f5f7ff", color: "#5c6d90" },
  viewer: { backgroundColor: "#f4f4f5", color: "#52525b" },
};

const roleOptions = [
  { value: "viewer", label: "Viewer" },
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

const initialInviteValues = {
  name: "",
  email: "",
  phone: "",
  role: "member",
};

const shouldRedirectToWorkspace = (error) =>
  Number(error?.status) === 403 || Number(error?.status) === 404;

export default function WorkspaceUsersMain({
  workspace = null,
  workspaceTitle = "Workspace",
}) {
  const { authSession } = useAuthContext();
  const navigate = useNavigate();
  const currentUserId = authSession?.user?.id ? Number(authSession.user.id) : null;
  const isWorkspaceOwner =
    String(workspace?.membershipRole || "")
      .trim()
      .toLowerCase() === "owner";
  const canEditWorkspaceUsers =
    isWorkspaceOwner ||
    String(workspace?.membershipRole || "")
      .trim()
      .toLowerCase() === "admin";
  const canInviteWorkspaceUsers =
    isWorkspaceOwner ||
    String(workspace?.membershipRole || "")
      .trim()
      .toLowerCase() === "admin";
  const canDeleteWorkspaceUsers =
    isWorkspaceOwner ||
    String(workspace?.membershipRole || "")
      .trim()
      .toLowerCase() === "admin";
  const [users, setUsers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteValues, setInviteValues] = useState(initialInviteValues);
  const [updatingWorkspaceUserIds, setUpdatingWorkspaceUserIds] = useState([]);
  const [deletingWorkspaceUserIds, setDeletingWorkspaceUserIds] = useState([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState([]);
  const [hoveredCellKey, setHoveredCellKey] = useState(null);

  const loadWorkspaceUsers = useCallback(async ({
    page = currentPage,
    search = debouncedSearchValue,
    limit = rowsPerPage,
    showError = true,
  } = {}) => {
    if (!authSession?.token || !workspace?.id) {
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);

    try {
      const result = await fetchWorkspaceUsers(workspace.id, authSession.token, {
        search,
        page,
        limit,
      });

      setUsers(Array.isArray(result?.users) ? result.users : []);
      setTotalUsers(Number(result?.pagination?.total || 0));
      setTotalPages(Number(result?.pagination?.totalPages || 1));
      setCurrentPage(Number(result?.pagination?.page || page));
    } catch (error) {
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);

      if (shouldRedirectToWorkspace(error)) {
        await showAccessDeniedAlert();
        navigate(APP_ROUTES.workspace, { replace: true });
        return;
      }

      if (showError) {
        await showErrorAlert(
          "Unable to load workspace users",
          error.message || "Something went wrong while loading workspace users."
        );
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [authSession?.token, currentPage, debouncedSearchValue, navigate, rowsPerPage, workspace?.id]);

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
    void loadWorkspaceUsers();
  }, [loadWorkspaceUsers]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalUsers === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const paginatedUsers = users;
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

  const buildHoveredCellKey = (userId, field) => `${userId}:${field}`;

  const handleInviteFieldChange = (field, value) => {
    setInviteValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleCloseInviteModal = () => {
    if (isSubmittingInvite) {
      return;
    }

    setIsInviteModalOpen(false);
    setInviteValues(initialInviteValues);
  };

  const handleInviteUser = async (event) => {
    event.preventDefault();

    if (!canInviteWorkspaceUsers) {
      await showErrorAlert(
        "Access denied",
        "Only the workspace owner or admin can invite users."
      );
      return;
    }

    if (
      !inviteValues.name.trim() ||
      !inviteValues.email.trim() ||
      !inviteValues.role.trim()
    ) {
      await showErrorAlert("Missing details", "Please complete all invite fields.");
      return;
    }

    setIsSubmittingInvite(true);

    try {
      if (!authSession?.token || !workspace?.id) {
        await showErrorAlert("Workspace unavailable", "We could not resolve the current workspace.");
        return;
      }

      const result = await inviteWorkspaceUser(
        workspace.id,
        {
          name: inviteValues.name.trim(),
          email: inviteValues.email.trim(),
          phone: inviteValues.phone.trim(),
          role: inviteValues.role.trim(),
        },
        authSession.token
      );

      await loadWorkspaceUsers({ page: 1, search: debouncedSearchValue, limit: rowsPerPage });
      await showSuccessAlert(
        "User invited",
        result?.createdNewUser && result?.temporaryPassword
          ? `The user was added to the workspace. Temporary password: ${result.temporaryPassword}`
          : result?.message || "The user has been added to the workspace successfully."
      );
      setIsInviteModalOpen(false);
      setInviteValues(initialInviteValues);
    } catch (error) {
      await showErrorAlert(
        "Unable to invite user",
        error.message || "Something went wrong while inviting the user to the workspace."
      );
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRoleChange = async (user, nextRole) => {
    if (!canEditWorkspaceUsers) {
      await showErrorAlert(
        "Access denied",
        "Only the workspace owner or admin can update workspace users."
      );
      return;
    }

    const normalizedNextRole = String(nextRole || "").trim().toLowerCase();
    const currentRole = String(user?.workspaceRole || "").trim().toLowerCase();

    if (!user?.id || !workspace?.id || !authSession?.token || !normalizedNextRole) {
      await showErrorAlert("Missing details", "Please select a workspace role.");
      return;
    }

    if (normalizedNextRole === currentRole) {
      return;
    }

    const selectedRoleLabel =
      roleOptions.find((roleOption) => roleOption.value === normalizedNextRole)?.label ||
      normalizedNextRole;
    const confirmation = await showConfirmAlert(
      "Update role?",
      `This will change ${buildUserFullName(user)} to ${selectedRoleLabel}.`,
      {
        confirmButtonText: "Update",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setUpdatingWorkspaceUserIds((currentIds) => [...currentIds, Number(user.id)]);

    try {
      const result = await updateWorkspaceUser(
        workspace.id,
        user.id,
        {
          role: normalizedNextRole,
        },
        authSession.token
      );

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          Number(currentUser.id) === Number(user.id) ? result.user : currentUser
        )
      );
      await showSuccessAlert(
        "Role updated",
        result?.message || "The workspace role has been updated successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to update role",
        error.message || "Something went wrong while updating the workspace role."
      );
    } finally {
      setUpdatingWorkspaceUserIds((currentIds) =>
        currentIds.filter((id) => id !== Number(user.id))
      );
    }
  };

  const handleDeleteWorkspaceUser = async (user) => {
    if (!user?.id || !workspace?.id || !authSession?.token || !canDeleteWorkspaceUsers) {
      return;
    }

    const confirmation = await showConfirmAlert(
      "Remove user?",
      `This will remove ${buildUserFullName(user)} from the workspace.`,
      {
        confirmButtonText: "Remove",
        cancelButtonText: "Cancel",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingWorkspaceUserIds((currentIds) => [...currentIds, Number(user.id)]);

    try {
      const result = await deleteWorkspaceUser(workspace.id, user.id, authSession.token);
      await loadWorkspaceUsers({ page: currentPage, search: debouncedSearchValue, limit: rowsPerPage });
      await showSuccessAlert(
        "User removed",
        result?.message || "The workspace user has been removed successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to remove user",
        error.message || "Something went wrong while removing the workspace user."
      );
    } finally {
      setDeletingWorkspaceUserIds((currentIds) =>
        currentIds.filter((id) => id !== Number(user.id))
      );
    }
  };

  const handleStatusToggle = async (user) => {
    if (!user?.id || !workspace?.id || !authSession?.token || !isWorkspaceOwner) {
      return;
    }

    const nextStatus = String(user.workspaceStatus || "").toLowerCase() === "active"
      ? "inactive"
      : "active";
    const nextStatusLabel = nextStatus === "active" ? "activate" : "deactivate";
    const confirmation = await showConfirmAlert(
      `${nextStatusLabel.charAt(0).toUpperCase() + nextStatusLabel.slice(1)} user?`,
      `This will ${nextStatusLabel} ${buildUserFullName(user)} in the workspace.`,
      {
        confirmButtonText: nextStatus === "active" ? "Activate" : "Deactivate",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsUpdatingStatus((currentIds) => [...currentIds, Number(user.id)]);

    try {
      const result = await updateWorkspaceUserStatus(
        workspace.id,
        user.id,
        nextStatus,
        authSession.token
      );

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          Number(currentUser.id) === Number(user.id) ? result.user : currentUser
        )
      );

      await showSuccessAlert(
        "Status updated",
        `${buildUserFullName(user)} is now ${nextStatus}.`
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to update status",
        error.message || "Something went wrong while updating the workspace user status."
      );
    } finally {
      setIsUpdatingStatus((currentIds) =>
        currentIds.filter((id) => id !== Number(user.id))
      );
    }
  };

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
              Manage workspace members, roles, and access inside {workspaceTitle}.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", lg: "auto" } }}>
            {canInviteWorkspaceUsers ? (
              <Button
                startDecorator={<PlusIcon />}
                onClick={() => setIsInviteModalOpen(true)}
                sx={{
                  whiteSpace: "nowrap",
                  borderRadius: "12px",
                  color: "var(--color-font-secondary)",
                }}
              >
                Invite Users
              </Button>
            ) : null}
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
                "& tbody td:nth-of-type(5), & thead th:nth-of-type(5)": {
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
                  <th style={{ width: "120px", minWidth: "120px" }}>Status</th>
                  {canDeleteWorkspaceUsers ? (
                    <th style={{ width: "140px", minWidth: "140px" }}>Action</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const fullName = buildUserFullName(user);
                  const initial = String(user.firstName || "U").charAt(0).toUpperCase();
                  const membershipRole = String(user.workspaceRole || "member").toLowerCase();
                  const chipStyle = roleChipStyles[membershipRole] || roleChipStyles.member;
                  const isCurrentUser = Number(user.id) === currentUserId;

                  return (
                    <tr key={user.id}>
                      <td>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          {user.id}
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
                              {fullName}
                            </Typography>
                          </Stack>
                        </Stack>
                      </td>
                      <td>
                        <Typography sx={{ color: "#1f2a44", whiteSpace: "nowrap" }}>
                          {user.email}
                        </Typography>
                      </td>
                      <td
                        onMouseEnter={() =>
                          setHoveredCellKey(buildHoveredCellKey(user.id, "role"))
                        }
                        onMouseLeave={() => setHoveredCellKey(null)}
                      >
                        {canEditWorkspaceUsers &&
                        hoveredCellKey === buildHoveredCellKey(user.id, "role") ? (
                          <Select
                            size="sm"
                            value={membershipRole}
                            onChange={(_, value) => {
                              if (value) {
                                void handleRoleChange(user, value);
                              }
                            }}
                            onClose={() => setHoveredCellKey(null)}
                            disabled={
                              updatingWorkspaceUserIds.includes(Number(user.id)) || isCurrentUser
                            }
                            sx={{ minHeight: "34px", fontSize: "0.85rem" }}
                          >
                            {roleOptions.map((roleOption) => (
                              <Option key={roleOption.value} value={roleOption.value}>
                                {roleOption.label}
                              </Option>
                            ))}
                          </Select>
                        ) : (
                          <Chip
                            size="sm"
                            variant="soft"
                            sx={{ borderRadius: "999px", fontWeight: 700, ...chipStyle }}
                          >
                            {user.workspaceRole}
                          </Chip>
                        )}
                      </td>
                      <td>
                        <Switch
                          checked={String(user.workspaceStatus || "").toLowerCase() === "active"}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleStatusToggle(user);
                          }}
                          disabled={
                            !isWorkspaceOwner ||
                            isUpdatingStatus.includes(Number(user.id)) ||
                            isCurrentUser
                          }
                          sx={{
                            cursor:
                              !isWorkspaceOwner ||
                              isUpdatingStatus.includes(Number(user.id)) ||
                              isCurrentUser
                              ? "not-allowed"
                              : "pointer",
                            "& *": {
                              cursor:
                                !isWorkspaceOwner ||
                                isUpdatingStatus.includes(Number(user.id)) ||
                                isCurrentUser
                                ? "not-allowed"
                                : "pointer",
                            },
                          }}
                        />
                      </td>
                      {canDeleteWorkspaceUsers ? (
                        <td>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {canDeleteWorkspaceUsers ? (
                              <IconButton
                                variant="plain"
                                color="danger"
                                disabled={
                                  deletingWorkspaceUserIds.includes(Number(user.id)) ||
                                  isCurrentUser
                                }
                                loading={deletingWorkspaceUserIds.includes(Number(user.id))}
                                onClick={() => {
                                  void handleDeleteWorkspaceUser(user);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            ) : null}
                          </Stack>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={canDeleteWorkspaceUsers ? 6 : 5}>
                      <Stack alignItems="center" spacing={0.75} sx={{ py: 5 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1f2a44" }}>
                          No users found
                        </Typography>
                        <Typography level="body-sm" sx={{ color: "#7b8596", textAlign: "center" }}>
                          Try a different name, workspace role, or email.
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

      <InviteWorkspaceUserModal
        open={isInviteModalOpen}
        values={inviteValues}
        loading={isSubmittingInvite}
        onClose={handleCloseInviteModal}
        onChange={handleInviteFieldChange}
        onSubmit={handleInviteUser}
      />
    </Sheet>
  );
}
