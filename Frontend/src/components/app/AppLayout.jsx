import { cloneElement, isValidElement, useState } from "react";
import { Box } from "@mui/joy";
import AppFooter from "./AppFooter";
import AppHeader from "./AppHeader";
import AppMain from "./AppMain";

export default function AppLayout({
  sidebar,
  title,
  fullName,
  initial,
  userRole,
  currentYear,
  children,
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = isSidebarCollapsed
    ? "56px"
    : "248px";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: `${sidebarWidth} minmax(0, 1fr)`,
        },
        backgroundColor: "var(--color-background)",
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
          gridTemplateRows: "72px minmax(0, 1fr) 50px",
        }}
      >
        <AppHeader
          title={title}
          fullName={fullName}
          initial={initial}
          userRole={userRole}
          onMenuClick={() => setIsSidebarCollapsed((value) => !value)}
        />
        <AppMain>{children}</AppMain>
        <AppFooter currentYear={currentYear} />
      </Box>
    </Box>
  );
}
