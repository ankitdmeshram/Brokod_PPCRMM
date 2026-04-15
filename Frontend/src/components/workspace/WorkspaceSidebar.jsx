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
        px: isCollapsed ? 1 : 2,
        py: 2,
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
              level="title-lg"
              sx={{ color: "var(--color-font-secondary)", fontWeight: 700 }}
            >
              B
            </Typography>
          ) : (
            <Typography
              level="title-lg"
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

        <Stack spacing={1.5}>
          {!isCollapsed ? (
            <Typography
              level="body-xs"
              sx={{
                color: "var(--color-font-secondary)",
                letterSpacing: "0.12em",
                fontWeight: 700,
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
              minHeight: "40px",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "var(--color-font-secondary)",
              px: isCollapsed ? 1 : 1.5,
              minWidth: isCollapsed ? "40px" : "auto",
              width: isCollapsed ? "40px" : "100%",
              alignSelf: isCollapsed ? "center" : "stretch",
              "& .MuiButton-startDecorator": {
                mr: 1.25,
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
