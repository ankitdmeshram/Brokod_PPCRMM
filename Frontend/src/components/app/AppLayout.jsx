import { cloneElement, isValidElement, useState } from "react";
import { Box, Modal, ModalClose, Sheet } from "@mui/joy";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/joy/styles";
import AppFooter from "./AppFooter";
import AppHeader from "./AppHeader";
import AppMain from "./AppMain";

export default function AppLayout({
  sidebar,
  title,
  titleContent,
  fullName,
  initial,
  userRole,
  showSuperAdminChip = true,
  initialSidebarCollapsed = false,
  currentYear,
  children,
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const sidebarWidth = isSidebarCollapsed
    ? "56px"
    : "232px";
  const sidebarElement = isValidElement(sidebar)
    ? cloneElement(sidebar, {
        isCollapsed: isSidebarCollapsed,
        isMobile: false,
      })
    : sidebar;
  const mobileSidebarElement = isValidElement(sidebar)
    ? cloneElement(sidebar, {
        isCollapsed: false,
        isMobile: true,
        onItemClick: () => setIsMobileSidebarOpen(false),
      })
    : sidebar;

  const handleMenuClick = () => {
    if (isDesktop) {
      setIsSidebarCollapsed((value) => !value);
      return;
    }

    setIsMobileSidebarOpen(true);
  };

  return (
    <>
      <Box
        sx={{
          "--app-scale": 0.92,
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: sidebar
            ? {
                xs: "1fr",
                md: `${sidebarWidth} minmax(0, 1fr)`,
              }
            : "1fr",
          backgroundColor: "var(--color-background)",
          fontSize: "calc(1rem * var(--app-scale))",
          transition: "grid-template-columns 0.25s ease",
        }}
      >
        {sidebarElement}

        <Box
          sx={{
            minWidth: 0,
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr) 46px",
          }}
        >
          <AppHeader
            title={title}
            titleContent={titleContent}
            fullName={fullName}
            initial={initial}
            userRole={userRole}
            showSuperAdminChip={showSuperAdminChip}
            onMenuClick={sidebar ? handleMenuClick : undefined}
          />
          <AppMain>{children}</AppMain>
          <AppFooter currentYear={currentYear} />
        </Box>
      </Box>

      <Modal open={Boolean(sidebar) && isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)}>
        <Sheet
          sx={{
            display: { xs: "flex", md: "none" },
            position: "fixed",
            top: 0,
            left: 0,
            width: "min(280px, calc(100vw - 32px))",
            minHeight: "100vh",
            borderRadius: 0,
            boxShadow: "lg",
            overflow: "hidden",
          }}
        >
          <ModalClose
            sx={{
              top: 12,
              right: 12,
              zIndex: 2,
              color: "#fff",
              backgroundColor: "rgba(255,255,255,0.12)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
              },
            }}
          />
          {mobileSidebarElement}
        </Sheet>
      </Modal>
    </>
  );
}
