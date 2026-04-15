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
    <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1.5, md: 2 } }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Typography
            level="title-lg"
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--color-font-primary)",
            }}
          >
            Workspaces
          </Typography>

          <Button
            startDecorator={<PlusIcon />}
            sx={{
              alignSelf: { xs: "flex-start", sm: "auto" },
              minHeight: "42px",
              color: "var(--color-font-secondary)",
            }}
          >
            Create workspace
          </Button>
        </Stack>

        <Sheet
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: "256px",
            p: 2.25,
            borderRadius: "20px",
            borderColor: "rgba(220, 226, 244, 0.95)",
            backgroundColor: "#fff",
            boxShadow: "0 18px 38px rgba(170, 180, 214, 0.16)",
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ color: "var(--color-primary)", display: "flex", fontSize: "1rem" }}>
                  <WorkspaceIcon />
                </Box>
                <Typography
                  level="title-lg"
                  sx={{ fontWeight: 700, color: "#1e293b", fontSize: "1.05rem" }}
                >
                  My Workspace
                </Typography>
              </Stack>
              <Chip
                size="sm"
                variant="soft"
                sx={{
                  backgroundColor: "#eef2ff",
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  borderRadius: "999px",
                  minHeight: 28,
                }}
              >
                Admin
              </Chip>
            </Stack>

            <Typography
              level="body-md"
              sx={{ color: "var(--color-font-secondary)", fontSize: "0.98rem" }}
            >
              My Workspace
            </Typography>

            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
              <IconButton
                variant="plain"
                color="neutral"
                sx={{ color: "var(--color-font-secondary)", minWidth: 30, minHeight: 30 }}
              >
                <EditIcon />
              </IconButton>
              <IconButton variant="plain" color="danger" sx={{ minWidth: 30, minHeight: 30 }}>
                <DeleteIcon />
              </IconButton>
              <IconButton
                variant="soft"
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
            </Stack>
          </Stack>
        </Sheet>
      </Stack>
    </Box>
  );
}
