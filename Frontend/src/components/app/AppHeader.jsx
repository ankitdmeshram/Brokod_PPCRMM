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
          sx={{ color: "#5b6478" }}
        >
          <MenuIcon />
        </IconButton>
        <Typography level="title-lg" sx={{ fontWeight: 700, color: "#111827" }}>
          {title}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Chip
          variant="soft"
          sx={{
            backgroundColor: "#eef2ff",
            color: "#3155ff",
            fontWeight: 700,
            px: 1.5,
          }}
        >
          Super Admin
        </Chip>
        <IconButton variant="plain" color="neutral" sx={{ color: "#5b6478" }}>
          <ExpandIcon />
        </IconButton>
        <Box sx={{ position: "relative" }}>
          <IconButton variant="plain" color="neutral" sx={{ color: "#5b6478" }}>
            <BellIcon />
          </IconButton>
          <Sheet
            sx={{
              position: "absolute",
              top: 2,
              right: 0,
              minWidth: 18,
              height: 18,
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
        <Avatar size="sm" sx={{ backgroundColor: "#eff3ff", color: "#5f6d8b" }}>
          {initial}
        </Avatar>
        <Typography level="title-md" sx={{ fontWeight: 700, color: "#111827" }}>
          {fullName}
        </Typography>
      </Stack>
    </Sheet>
  );
}
