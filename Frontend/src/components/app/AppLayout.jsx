import { cloneElement, isValidElement, useState } from "react";
import { Box } from "@mui/joy";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const sidebarWidth = isSidebarCollapsed
    ? "56px"
    : "232px";

  return (
    <Box
      sx={{
        "--app-scale": 0.92,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: `${sidebarWidth} minmax(0, 1fr)`,
        },
        backgroundColor: "var(--color-background)",
        fontSize: "calc(1rem * var(--app-scale))",
        transition: "grid-template-columns 0.25s ease",
      }}
    >
      {isValidElement(sidebar)
        ? cloneElement(sidebar, { isCollapsed: isSidebarCollapsed })
        : sidebar}

      <Box
        sx={{
          minWidth: 0,
          display: "grid",
          gridTemplateRows: "64px minmax(0, 1fr) 46px",
        }}
      >
        <AppHeader
          title={title}
          titleContent={titleContent}
          fullName={fullName}
          initial={initial}
          userRole={userRole}
          showSuperAdminChip={showSuperAdminChip}
          onMenuClick={() => setIsSidebarCollapsed((value) => !value)}
        />
        <AppMain>{children}</AppMain>
        <AppFooter currentYear={currentYear} />
      </Box>
    </Box>
  );
}
