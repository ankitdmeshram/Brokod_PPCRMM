import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import {
  BellIcon,
  ExpandIcon,
  MenuIcon,
} from "../workspace/WorkspaceIcons";

export default function AppHeader({ title, fullName, initial, onMenuClick }) {
  return (
    <Sheet
      sx={{
        px: { xs: 2, md: 3 },
        borderBottom: "1px solid rgba(198, 205, 228, 0.8)",
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <IconButton
          variant="plain"
          color="neutral"
          onClick={onMenuClick}
          sx={{ color: "var(--color-font-secondary)" }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          level="title-lg"
          sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
        >
          {title}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Chip
          variant="soft"
          sx={{
            backgroundColor: "#eef2ff",
            color: "var(--color-primary)",
            fontWeight: 700,
            px: 1.5,
          }}
        >
          Super Admin
        </Chip>
        <IconButton
          variant="plain"
          color="neutral"
          sx={{ color: "var(--color-font-secondary)" }}
        >
          <ExpandIcon />
        </IconButton>
        <Box sx={{ position: "relative" }}>
          <IconButton
            variant="plain"
            color="neutral"
            sx={{ color: "var(--color-font-secondary)" }}
          >
            <BellIcon />
          </IconButton>
          <Sheet
            sx={{
              position: "absolute",
              top: 2,
              right: 0,
              minWidth: "18px",
              height: "18px",
              px: 0.5,
              borderRadius: "999px",
              backgroundColor: "#ff6f59",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            3
          </Sheet>
        </Box>
        <Divider orientation="vertical" />
        <Avatar
          size="sm"
          sx={{ backgroundColor: "#eef2ff", color: "#5f6d8b" }}
        >
          {initial}
        </Avatar>
        <Typography
          level="title-md"
          sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
        >
          {fullName}
        </Typography>
      </Stack>
    </Sheet>
  );
}
