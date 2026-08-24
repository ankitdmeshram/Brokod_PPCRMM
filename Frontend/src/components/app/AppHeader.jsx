import {
  Avatar,
  Button,
  Chip,
  Divider,
  Dropdown,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import { Link as RouterLink } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { APP_ROUTES } from "../../router/authRoutes";
import { showErrorAlert } from "../../services/alert.service";
import {
  ExpandIcon,
  MenuIcon,
} from "../workspace/WorkspaceIcons";

export default function AppHeader({
  fullName,
  initial,
  userRole,
  showSuperAdminChip = true,
  onMenuClick,
}) {
  const { clearAuthSession } = useAuthContext();
  const isSuperAdmin = String(userRole || "").toLowerCase() === "super-admin";

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      }

      await document.exitFullscreen();
    } catch {
      await showErrorAlert(
        "Fullscreen unavailable",
        "Your browser could not switch fullscreen mode right now."
      );
    }
  };

  const handleSignOut = () => {
    void clearAuthSession();
  };

  return (
    <Sheet
      sx={{
        px: { xs: 1.5, md: 2.5 },
        py: 1,
        minHeight: 64,
        borderBottom: "1px solid rgba(198, 205, 228, 0.8)",
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <IconButton
          variant="plain"
          color="neutral"
          size="sm"
          onClick={onMenuClick}
          sx={{ color: "var(--color-font-secondary)" }}
        >
          <MenuIcon />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
        {isSuperAdmin && showSuperAdminChip ? (
          <Chip
            component={RouterLink}
            to={APP_ROUTES.superAdmin}
            variant="soft"
            size="sm"
            sx={{
              backgroundColor: "#eef2ff",
              color: "var(--color-primary)",
              fontWeight: 700,
              px: 1.25,
              textDecoration: "none",
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "#e3eaff",
              },
            }}
          >
            Super Admin
          </Chip>
        ) : null}
        <IconButton
          variant="plain"
          color="neutral"
          size="sm"
          onClick={handleToggleFullscreen}
          sx={{ color: "var(--color-font-secondary)" }}
        >
          <ExpandIcon />
        </IconButton>
        <Divider orientation="vertical" />
        <Dropdown>
          <MenuButton
            slots={{ root: Button }}
            variant="plain"
            color="neutral"
            sx={{
              px: { xs: 0.375, lg: 0.625 },
              py: 0.375,
              borderRadius: "999px",
              color: "var(--color-font-primary)",
              backgroundColor: "#eef2ff",
              minHeight: 38,
              minWidth: { xs: 38, lg: "auto" },
              "&:hover": {
                backgroundColor: "#e4ebff",
              },
            }}
          >
            <Stack direction="row" spacing={{ xs: 0, lg: 1 }} alignItems="center">
              <Avatar
                size="sm"
                sx={{ backgroundColor: "#fff", color: "#5f6d8b" }}
              >
                {initial}
              </Avatar>
              <Typography
                level="body-md"
                sx={{
                  display: { xs: "none", lg: "block" },
                  fontWeight: 700,
                  color: "var(--color-font-primary)",
                }}
              >
                {fullName}
              </Typography>
            </Stack>
          </MenuButton>
          <Menu
            placement="bottom-end"
            sx={{
              minWidth: 180,
              borderRadius: "8px",
              p: 0.5,
            }}
          >
            <MenuItem component={RouterLink} to={APP_ROUTES.myAccount}>
              My Account
            </MenuItem>
            <MenuItem onClick={handleSignOut}>Log out</MenuItem>
          </Menu>
        </Dropdown>
      </Stack>
    </Sheet>
  );
}
