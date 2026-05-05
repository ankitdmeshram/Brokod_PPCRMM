import { Button, Sheet, Stack, Typography } from "@mui/joy";
import { ArrowIcon, WorkspaceIcon } from "./WorkspaceIcons";

export default function WorkspaceSidebar({ isCollapsed = false }) {
  return (
    <Sheet
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        backgroundColor: "var(--color-primary)",
        color: "var(--color-font-secondary)",
        px: isCollapsed ? 0.875 : 1.75,
        py: 1.75,
        overflow: "hidden",
        transition: "padding 0.25s ease",
      }}
    >
      <Stack spacing={1} alignItems={isCollapsed ? "center" : "stretch"}>
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
          {!isCollapsed ? (
            <Typography
              level="body-xs"
              sx={{
                color: "var(--color-font-secondary)",
                letterSpacing: "0.12em",
                fontWeight: 700,
                fontSize: "0.72rem",
              }}
            >
              WORKSPACE
            </Typography>
          ) : null}

          <Button
            variant="soft"
            startDecorator={isCollapsed ? null : <WorkspaceIcon />}
            endDecorator={isCollapsed ? null : <ArrowIcon />}
            sx={{
              justifyContent: isCollapsed ? "center" : "flex-start",
              minHeight: "36px",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "var(--color-font-secondary)",
              px: isCollapsed ? 0.875 : 1.35,
              minWidth: isCollapsed ? "36px" : "auto",
              width: isCollapsed ? "36px" : "100%",
              alignSelf: isCollapsed ? "center" : "stretch",
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
            {isCollapsed ? <WorkspaceIcon /> : "Workspace"}
          </Button>
        </Stack>
      </Stack>
    </Sheet>
  );
}
