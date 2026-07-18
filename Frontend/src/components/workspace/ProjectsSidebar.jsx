import { APP_ROUTES } from "../../router/authRoutes";
import { Button, Sheet, Stack, Tooltip, Typography } from "@mui/joy";
import { Link as RouterLink } from "react-router-dom";
import {
  ArrowIcon,
  FolderIcon,
  GridIcon,
  NotificationIcon,
  SidebarBackIcon,
  UsersIcon,
} from "./WorkspaceIcons";

const navItems = [
  { key: "overview", icon: <GridIcon />, label: "Overview" },
  { key: "projects", icon: <FolderIcon />, label: "Projects", active: true },
  { key: "users", icon: <UsersIcon />, label: "Users" },
  { key: "notifications", icon: <NotificationIcon />, label: "Notifications" },
];

export default function ProjectsSidebar({
  isCollapsed = false,
  isMobile = false,
  sectionLabel = "",
  items = navItems,
  backToApplicationsRoute = "",
  backToProjectsRoute = "",
  backToProjectsLabel = "Back to Projects",
  showBackToWorkspace = true,
  onNavigateAttempt = null,
  onItemClick = null,
}) {
  const buildNavigationProps = (to) =>
    onNavigateAttempt && to
      ? {
          component: "button",
          onClick: () => {
            void onNavigateAttempt(to);
            onItemClick?.();
          },
        }
      : {
          component: to ? RouterLink : "button",
          to,
          onClick: () => {
            onItemClick?.();
          },
        };

  const renderSidebarAction = (content, tooltipTitle) =>
    isCollapsed ? (
      <Tooltip title={tooltipTitle} placement="right" variant="soft">
        {content}
      </Tooltip>
    ) : (
      content
    );

  return (
    <Sheet
      sx={{
        display: isMobile ? "flex" : { xs: "none", md: "flex" },
        flexDirection: "column",
        backgroundColor: "var(--color-primary)",
        color: "var(--color-font-secondary)",
        px: isCollapsed ? 0.875 : 1.75,
        py: 1.75,
        overflow: "hidden",
        transition: "padding 0.25s ease",
        width: "100%",
        minHeight: "100%",
      }}
    >
      <Stack
        spacing={1}
        alignItems={isCollapsed ? "center" : "stretch"}
        sx={{ flex: 1, minHeight: 0 }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent={isCollapsed ? "center" : "flex-start"}
        >
          {isCollapsed ? (
            <Typography
              level="title-md"
              sx={{ color: "var(--color-font-secondary)", fontWeight: 700 }}
            >
              B
            </Typography>
          ) : (
            <Typography
              level="title-md"
              sx={{
                color: "var(--color-font-secondary)",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Brokod
            </Typography>
          )}
        </Stack>

        <Stack spacing={1.25}>
          {!isCollapsed && sectionLabel ? (
            <Typography
              level="body-xs"
              sx={{
                color: "var(--color-font-secondary)",
                letterSpacing: "0.12em",
                fontWeight: 700,
                fontSize: "0.72rem",
              }}
            >
              {sectionLabel}
            </Typography>
          ) : null}

          {items.map((item) =>
            renderSidebarAction(
              <Button
                key={item.key}
                {...buildNavigationProps(item.to)}
                variant={item.active ? "soft" : "plain"}
                startDecorator={isCollapsed ? null : item.icon}
                endDecorator={isCollapsed ? null : item.active ? <ArrowIcon /> : null}
                sx={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  minHeight: "36px",
                  backgroundColor: item.active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: "var(--color-font-secondary)",
                  px: isCollapsed ? 0.875 : 1.35,
                  minWidth: isCollapsed ? "36px" : "auto",
                  width: isCollapsed ? "36px" : "100%",
                  alignSelf: isCollapsed ? "center" : "stretch",
                  textDecoration: "none",
                  "& .MuiButton-startDecorator": {
                    mr: 1,
                  },
                  "& .MuiButton-endDecorator": {
                    ml: "auto",
                  },
                  "& .MuiButton-label": {
                    flex: isCollapsed ? "0 0 auto" : 1,
                    textAlign: "left",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.16)",
                  },
                }}
              >
                {isCollapsed ? item.icon : item.label}
              </Button>,
              item.label
            )
          )}
        </Stack>

        <Stack spacing={1} sx={{ mt: "auto", width: "100%" }}>
          {backToApplicationsRoute ? (
            renderSidebarAction(
              <Button
                {...buildNavigationProps(backToApplicationsRoute)}
                variant="plain"
                startDecorator={isCollapsed ? null : <SidebarBackIcon />}
                sx={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  minHeight: "36px",
                  color: "var(--color-font-secondary)",
                  px: isCollapsed ? 0.875 : 1.35,
                  minWidth: isCollapsed ? "36px" : "auto",
                  width: isCollapsed ? "36px" : "100%",
                  alignSelf: isCollapsed ? "center" : "stretch",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  "& .MuiButton-startDecorator": { mr: 1 },
                  "& .MuiButton-label": {
                    flex: isCollapsed ? "0 0 auto" : 1,
                    textAlign: "left",
                  },
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.16)" },
                }}
              >
                {isCollapsed ? <SidebarBackIcon /> : "Back to Applications"}
              </Button>,
              "Back to Applications"
            )
          ) : null}

          {backToProjectsRoute ? (
            renderSidebarAction(
              <Button
                {...buildNavigationProps(backToProjectsRoute)}
                variant="plain"
                startDecorator={isCollapsed ? null : <SidebarBackIcon />}
                sx={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  minHeight: "36px",
                  color: "var(--color-font-secondary)",
                  px: isCollapsed ? 0.875 : 1.35,
                  minWidth: isCollapsed ? "36px" : "auto",
                  width: isCollapsed ? "36px" : "100%",
                  alignSelf: isCollapsed ? "center" : "stretch",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  "& .MuiButton-startDecorator": {
                    mr: 1,
                  },
                  "& .MuiButton-label": {
                    flex: isCollapsed ? "0 0 auto" : 1,
                    textAlign: "left",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.16)",
                  },
                }}
              >
                {isCollapsed ? <SidebarBackIcon /> : backToProjectsLabel}
              </Button>,
              backToProjectsLabel
            )
          ) : null}

          {showBackToWorkspace ? (
            renderSidebarAction(
              <Button
                {...buildNavigationProps(APP_ROUTES.workspace)}
                variant="plain"
                startDecorator={isCollapsed ? null : <SidebarBackIcon />}
                sx={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  minHeight: "36px",
                  color: "var(--color-font-secondary)",
                  px: isCollapsed ? 0.875 : 1.35,
                  minWidth: isCollapsed ? "36px" : "auto",
                  width: isCollapsed ? "36px" : "100%",
                  alignSelf: isCollapsed ? "center" : "stretch",
                  textDecoration: "none",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  "& .MuiButton-startDecorator": {
                    mr: 1,
                  },
                  "& .MuiButton-label": {
                    flex: isCollapsed ? "0 0 auto" : 1,
                    textAlign: "left",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.16)",
                  },
                }}
              >
                {isCollapsed ? <SidebarBackIcon /> : "Back to Workspace"}
              </Button>,
              "Back to Workspace"
            )
          ) : null}
        </Stack>
      </Stack>
    </Sheet>
  );
}
