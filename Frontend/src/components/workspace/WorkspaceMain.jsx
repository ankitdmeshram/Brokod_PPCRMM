import {
  Box,
  Button,
  Chip,
  IconButton,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import {
  DeleteIcon,
  EditIcon,
  EnterIcon,
  PlusIcon,
  WorkspaceIcon,
} from "./WorkspaceIcons";

export default function WorkspaceMain() {
  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Typography
            level="h2"
            sx={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}
          >
            Workspaces
          </Typography>

          <Button
            startDecorator={<PlusIcon />}
            sx={{
              alignSelf: { xs: "flex-start", sm: "auto" },
              minHeight: 42,
              px: 2,
              backgroundColor: "#3155ff",
              boxShadow: "0 16px 32px rgba(49, 85, 255, 0.26)",
            }}
          >
            Create workspace
          </Button>
        </Stack>

        <Sheet
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 255,
            p: 2,
            borderRadius: "8px",
            borderColor: "rgba(207, 214, 235, 0.9)",
            backgroundColor: "#fff",
            boxShadow: "0 22px 40px rgba(170, 180, 214, 0.18)",
          }}
        >
          <Stack spacing={2.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ color: "#3155ff", display: "flex" }}>
                  <WorkspaceIcon />
                </Box>
                <Typography level="title-lg" sx={{ fontWeight: 700, color: "#1e293b" }}>
                  My Workspace
                </Typography>
              </Stack>
              <Chip
                size="sm"
                variant="soft"
                sx={{
                  backgroundColor: "#eef2ff",
                  color: "#3155ff",
                  fontWeight: 700,
                }}
              >
                Admin
              </Chip>
            </Stack>

            <Typography level="body-md" sx={{ color: "#566b91" }}>
              My Workspace
            </Typography>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <IconButton variant="plain" color="neutral" sx={{ color: "#6b7280" }}>
                <EditIcon />
              </IconButton>
              <IconButton variant="plain" color="danger">
                <DeleteIcon />
              </IconButton>
              <IconButton
                variant="soft"
                sx={{ backgroundColor: "#eef2ff", color: "#3155ff" }}
              >
                <EnterIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Sheet>
      </Stack>
    </Box>
  );
}
