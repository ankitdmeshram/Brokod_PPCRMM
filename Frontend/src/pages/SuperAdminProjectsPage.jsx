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
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import EditUserModal from "../components/workspace/EditUserModal";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import { useAuthContext } from "../context/AuthContext";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../services/alert.service";
import { APP_ROUTES, SUPER_ADMIN_ROUTES } from "../router/authRoutes";
import {
  deleteUser,
  fetchUsers,
  updateUser,
  updateUserStatus,
} from "../services/user.service";
import {
  GridIcon,
  DeleteIcon,
  EditIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "../components/workspace/WorkspaceIcons";

const sectionContent = {
  overview: {
    title: "Overview",
    description:
      "The super admin overview page is coming soon. This space will hold your top-level platform insights, management tools, and global settings.",
  },
  users: {
    title: "Users",
    description:
      "The super admin users page is coming soon. This space will help you manage platform users, access, and account-level actions.",
  },
  settings: {
    title: "Settings",
    description:
      "The super admin settings page is coming soon. This space will centralize platform configuration and administrative controls.",
  },
};

const initialEditUserValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "user",
};

function SuperAdminUsersPanel() {
  const { authSession } = useAuthContext();
  const currentUserId = Number(authSession?.user?.id);
  const [users, setUsers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [deletingUserIds, setDeletingUserIds] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editValues, setEditValues] = useState(initialEditUserValues);

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
    const loadUsers = async () => {
      if (!authSession?.token) {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
        setIsLoadingUsers(false);
        return;
      }

      setIsLoadingUsers(true);

      try {
        const result = await fetchUsers(authSession.token, {
          search: debouncedSearchValue,
          page: currentPage,
          limit: rowsPerPage,
        });
        setUsers(Array.isArray(result?.users) ? result.users : []);
        setTotalUsers(Number(result?.pagination?.total || 0));
        setTotalPages(Number(result?.pagination?.totalPages || 1));
      } catch (error) {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
        await showErrorAlert(
          "Unable to load users",
          error.message || "Something went wrong while loading users."
        );
      } finally {
        setIsLoadingUsers(false);
      }
    };

    void loadUsers();
  }, [authSession?.token, currentPage, debouncedSearchValue, rowsPerPage]);

  const reloadUsers = async (nextPage = currentPage) => {
    if (!authSession?.token) {
      return;
    }

    setIsLoadingUsers(true);

    try {
      const result = await fetchUsers(authSession.token, {
        search: debouncedSearchValue,
        page: nextPage,
        limit: rowsPerPage,
      });
      setUsers(Array.isArray(result?.users) ? result.users : []);
      setTotalUsers(Number(result?.pagination?.total || 0));
      setTotalPages(Number(result?.pagination?.totalPages || 1));
      setCurrentPage(Number(result?.pagination?.page || nextPage));
    } catch (error) {
      await showErrorAlert(
        "Unable to load users",
        error.message || "Something went wrong while loading users."
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleStatusToggle = async (userId) => {
    const user = users.find((item) => item.id === userId);

    if (!user || !authSession?.token) {
      return;
    }

    const nextIsActive = !user.isActive;
    const nextStatusLabel = nextIsActive ? "activate" : "deactivate";
    const confirmation = await showConfirmAlert(
      `${nextStatusLabel.charAt(0).toUpperCase() + nextStatusLabel.slice(1)} user?`,
      `This will ${nextStatusLabel} ${user.firstName} ${user.lastName}.`,
      {
        confirmButtonText: nextIsActive ? "Activate" : "Deactivate",
      }
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsUpdatingStatus((currentIds) => [...currentIds, userId]);

    void updateUserStatus(userId, nextIsActive, authSession.token)
      .then(async (result) => {
        setUsers((currentUsers) =>
          currentUsers.map((currentUser) =>
            currentUser.id === userId ? result.user : currentUser
          )
        );
        await showSuccessAlert(
          "Status updated",
          `${user.firstName} ${user.lastName} is now ${nextIsActive ? "active" : "inactive"}.`
        );
      })
      .catch(async (error) => {
        await showErrorAlert(
          "Unable to update status",
          error.message || "Something went wrong while updating the user status."
        );
      })
      .finally(() => {
        setIsUpdatingStatus((currentIds) => currentIds.filter((id) => id !== userId));
      });
  };

  const handleDeleteUser = async (user) => {
    if (!user?.id || !authSession?.token) {
      return;
    }

    const confirmation = await showConfirmAlert(
      "Delete user?",
      `This will permanently delete ${user.firstName} ${user.lastName}.`
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingUserIds((currentIds) => [...currentIds, user.id]);

    try {
      const result = await deleteUser(user.id, authSession.token);
      const nextTotalUsers = Math.max(0, totalUsers - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalUsers / rowsPerPage));
      const nextPage = Math.min(currentPage, nextTotalPages);

      await reloadUsers(nextPage);

      await showSuccessAlert(
        "User deleted",
        result?.message || "The user has been deleted successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to delete user",
        error.message || "Something went wrong while deleting the user."
      );
    } finally {
      setDeletingUserIds((currentIds) => currentIds.filter((id) => id !== user.id));
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleOpenEditModal = (user) => {
    if (!user) {
      return;
    }

    setEditingUserId(user.id);
    setEditValues({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "user",
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = (forceClose = false) => {
    if (isUpdatingUser && !forceClose) {
      return;
    }

    setIsEditModalOpen(false);
    setIsUpdatingUser(false);
    setEditingUserId(null);
    setEditValues(initialEditUserValues);
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();

    if (!editingUserId || !authSession?.token) {
      return;
    }

    if (
      !editValues.firstName.trim() ||
      !editValues.lastName.trim() ||
      !editValues.email.trim() ||
      !editValues.phone.trim() ||
      !editValues.role.trim()
    ) {
      await showErrorAlert("Missing details", "Please complete all user fields.");
      return;
    }

    setIsUpdatingUser(true);

    try {
      const result = await updateUser(
        editingUserId,
        {
          firstName: editValues.firstName.trim(),
          lastName: editValues.lastName.trim(),
          email: editValues.email.trim(),
          phone: editValues.phone.trim(),
          role: editValues.role.trim(),
        },
        authSession.token
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === editingUserId ? result.user : user))
      );

      handleCloseEditModal(true);

      await showSuccessAlert(
        "User updated",
        result?.message || "The user has been updated successfully."
      );
    } catch (error) {
      await showErrorAlert(
        "Unable to update user",
        error.message || "Something went wrong while updating the user."
      );
      setIsUpdatingUser(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalUsers === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers;
  const pageEndIndex = totalUsers === 0 ? 0 : Math.min(pageStartIndex + rowsPerPage, totalUsers);

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
              Manage platform users, roles, and organization access from one place.
            </Typography>
          </Stack>

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
                <th style={{ width: "140px", minWidth: "140px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => {
                const fullName = `${user.firstName} ${user.lastName}`.trim();
                const initial = user.firstName.charAt(0).toUpperCase();
                const isCurrentUser = user.id === currentUserId;

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
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        sx={{
                          borderRadius: "999px",
                          backgroundColor: "#eef2ff",
                          color: "#3155ff",
                          fontWeight: 700,
                          px: 1.2,
                        }}
                      >
                        {user.role}
                      </Chip>
                    </td>
                    <td>
                      <Switch
                        checked={user.isActive}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleStatusToggle(user.id);
                        }}
                        disabled={isUpdatingStatus.includes(user.id) || isCurrentUser}
                        sx={{
                          cursor:
                            isUpdatingStatus.includes(user.id) || isCurrentUser
                              ? "not-allowed"
                              : "pointer",
                          "& *": {
                            cursor:
                              isUpdatingStatus.includes(user.id) || isCurrentUser
                                ? "not-allowed"
                                : "pointer",
                          },
                        }}
                      />
                    </td>
                    <td>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <IconButton
                          variant="plain"
                          sx={{
                            color: "#3155ff",
                          }}
                          onClick={() => handleOpenEditModal(user)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          variant="plain"
                          sx={{
                            color: isCurrentUser ? "#9aa6b2" : "#d92d20",
                          }}
                          color={isCurrentUser ? "neutral" : "danger"}
                          disabled={deletingUserIds.includes(user.id) || isCurrentUser}
                          onClick={() => handleDeleteUser(user)}
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
                      <Typography level="body-sm" sx={{ color: "#7b8596" }}>
                        Try a different name, role, email, or status.
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
                  <Button
                    variant={pageNumber === safeCurrentPage ? "soft" : "plain"}
                    onClick={() => setCurrentPage(pageNumber)}
                    sx={{
                      minWidth: 36,
                      height: 34,
                      p: 0,
                      borderRadius: "8px",
                      backgroundColor:
                        pageNumber === safeCurrentPage ? "#e6ecff" : "transparent",
                      color: pageNumber === safeCurrentPage ? "#3155ff" : "#60708e",
                      fontWeight: 700,
                    }}
                  >
                    {pageNumber}
                  </Button>
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

      <EditUserModal
        open={isEditModalOpen}
        values={editValues}
        loading={isUpdatingUser}
        onClose={handleCloseEditModal}
        onChange={handleEditFieldChange}
        onSubmit={handleUpdateUser}
      />
    </Sheet>
  );
}

export default function SuperAdminProjectsPage({ section = "overview" }) {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const content = sectionContent[section] || sectionContent.overview;
  const superAdminNavItems = useMemo(
    () => [
      {
        key: "overview",
        icon: <GridIcon />,
        label: "Overview",
        to: SUPER_ADMIN_ROUTES.overview,
        active: location.pathname === SUPER_ADMIN_ROUTES.overview,
      },
      {
        key: "users",
        icon: <UsersIcon />,
        label: "Users",
        to: SUPER_ADMIN_ROUTES.users,
        active: location.pathname === SUPER_ADMIN_ROUTES.users,
      },
    ],
    [location.pathname]
  );

  return (
    <AppLayout
      sidebar={
        <ProjectsSidebar sectionLabel="SUPER ADMIN" items={superAdminNavItems} />
      }
      titleContent={
        <Button
          component={RouterLink}
          to={APP_ROUTES.workspace}
          variant="plain"
          color="neutral"
          sx={{
            px: 0,
            py: 0,
            minHeight: "auto",
            fontSize: "0.96rem",
            fontWeight: 700,
            color: "var(--color-font-primary)",
            "&:hover": {
              backgroundColor: "transparent",
              color: "#3155ff",
            },
          }}
        >
          Back To Workspace
        </Button>
      }
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      showSuperAdminChip={false}
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
        {section === "users" ? (
          <SuperAdminUsersPanel />
        ) : (
          <Sheet
            variant="outlined"
            sx={{
              width: "100%",
              minHeight: { xs: "calc(100vh - 180px)", md: "calc(100vh - 170px)" },
              borderRadius: "10px",
              borderColor: "rgba(220, 226, 244, 0.95)",
              backgroundColor: "#fff",
              boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
              display: "grid",
              placeItems: "center",
              px: 2.5,
              py: 3.5,
            }}
          >
            <Stack spacing={1.75} alignItems="center" sx={{ maxWidth: 460, textAlign: "center" }}>
              <Typography
                level="h3"
                sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
              >
                Coming Soon
              </Typography>
              <Typography level="body-md" sx={{ color: "#5c6d90", lineHeight: 1.7 }}>
                {content.description}
              </Typography>
              <Chip
                variant="soft"
                sx={{
                  borderRadius: "8px",
                  px: 1.5,
                  py: 0.75,
                  backgroundColor: "#eef2ff",
                  color: "#3155ff",
                  fontWeight: 700,
                }}
              >
                {content.title} Page Coming Soon
              </Chip>
            </Stack>
          </Sheet>
        )}
      </Box>
    </AppLayout>
  );
}
