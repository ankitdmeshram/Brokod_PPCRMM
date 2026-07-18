import { Box, Chip, IconButton, Sheet, Stack, Tooltip, Typography } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import { buildWorkspaceProjectsRoute } from "../../router/authRoutes";
import { EnterIcon, FolderIcon } from "./WorkspaceIcons";

const applications = [
  {
    key: "projects",
    name: "Project Management",
    description: "Plan projects, organize tasks, collaborate with users, and track delivery.",
    status: "Available",
    icon: <FolderIcon />,
    buildRoute: buildWorkspaceProjectsRoute,
  },
];

export default function ApplicationsMain({ workspace }) {
  const navigate = useNavigate();

  const handleEnterApplication = (application) => {
    if (!workspace?.slug) {
      return;
    }

    navigate(application.buildRoute(workspace.slug), {
      state: { workspace },
    });
  };

  return (
    <Box sx={{ px: { xs: 1.25, md: 1.75 }, py: { xs: 1.25, md: 1.75 } }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.4}>
          <Typography
            level="title-lg"
            sx={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--color-font-primary)",
            }}
          >
            Applications
          </Typography>
          <Typography level="body-sm" sx={{ color: "#64748b" }}>
            Choose an application to continue working in this workspace.
          </Typography>
        </Stack>

        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.75}>
          {applications.map((application) => (
            <Sheet
              key={application.key}
              variant="outlined"
              onDoubleClick={() => handleEnterApplication(application)}
              sx={{
                width: "100%",
                maxWidth: "256px",
                p: 2,
                borderRadius: "18px",
                borderColor: "rgba(220, 226, 244, 0.95)",
                backgroundColor: "#fff",
                boxShadow: "0 18px 38px rgba(170, 180, 214, 0.16)",
                cursor: "default",
              }}
            >
              <Stack spacing={1.75}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                    <Box
                      sx={{
                        color: "var(--color-primary)",
                        display: "flex",
                        fontSize: "1rem",
                      }}
                    >
                      {application.icon}
                    </Box>
                    <Typography
                      level="title-lg"
                      onClick={() => handleEnterApplication(application)}
                      sx={{
                        fontWeight: 700,
                        color: "#1e293b",
                        fontSize: "0.96rem",
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        "&:hover": { color: "var(--color-primary)" },
                      }}
                    >
                      {application.name}
                    </Typography>
                  </Stack>
                  <Chip
                    size="sm"
                    variant="soft"
                    sx={{
                      backgroundColor: "#e9fbef",
                      color: "#1b8f4d",
                      fontWeight: 700,
                      borderRadius: "999px",
                      minHeight: 28,
                    }}
                  >
                    {application.status}
                  </Chip>
                </Stack>

                <Typography level="body-md" sx={{ color: "#64748b", fontSize: "0.9rem" }}>
                  {application.description}
                </Typography>

                <Stack direction="row" justifyContent="flex-end" alignItems="center">
                  <Tooltip title={`Enter ${application.name}`} variant="soft">
                    <IconButton
                      variant="soft"
                      onClick={() => handleEnterApplication(application)}
                      sx={{
                        backgroundColor: "#eef2ff",
                        color: "var(--color-primary)",
                        minWidth: 34,
                        minHeight: 34,
                        borderRadius: "10px",
                      }}
                    >
                      <EnterIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Sheet>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
