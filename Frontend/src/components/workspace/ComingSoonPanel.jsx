import { Box, Chip, Sheet, Stack, Typography } from "@mui/joy";

export default function ComingSoonPanel({
  eyebrow = "",
  title = "Coming Soon",
  description = "",
}) {
  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        px: { xs: 1.25, md: 1.75 },
        py: { xs: 1.25, md: 1.75 },
      }}
    >
      <Sheet
        variant="outlined"
        sx={{
          width: "100%",
          minHeight: { xs: "calc(100vh - 180px)", md: "calc(100vh - 170px)" },
          borderRadius: "10px",
          borderColor: "rgba(220, 226, 244, 0.95)",
          backgroundColor: "#fff",
          boxShadow: "0 18px 38px rgba(170, 180, 214, 0.12)",
          display: "grid",
          placeItems: "center",
          px: 2.5,
          py: 3.5,
        }}
      >
        <Stack spacing={1.75} alignItems="center" sx={{ maxWidth: 560, textAlign: "center" }}>
          {eyebrow ? (
            <Chip
              variant="soft"
              sx={{
                borderRadius: "999px",
                px: 1.5,
                py: 0.75,
                backgroundColor: "#eef2ff",
                color: "#3155ff",
                fontWeight: 700,
              }}
            >
              {eyebrow}
            </Chip>
          ) : null}
          <Typography level="h3" sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}>
            {title}
          </Typography>
          {description ? (
            <Typography level="body-md" sx={{ color: "#5c6d90", lineHeight: 1.7 }}>
              {description}
            </Typography>
          ) : null}
          <Chip
            variant="soft"
            sx={{
              borderRadius: "8px",
              px: 1.5,
              py: 0.75,
              backgroundColor: "#eef2ff",
              color: "#3155ff",
              fontWeight: 700,
            }}
          >
            {title} Coming Soon
          </Chip>
        </Stack>
      </Sheet>
    </Box>
  );
}
