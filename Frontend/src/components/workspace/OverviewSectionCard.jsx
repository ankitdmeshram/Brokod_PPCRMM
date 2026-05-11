import { Box, Chip, Sheet, Stack, Typography } from "@mui/joy";

export default function OverviewSectionCard({
  title,
  description,
  countLabel = "",
  chipSx = {},
  children,
  width = { xs: "100%", lg: "calc(50% - 8px)" },
}) {
  return (
    <Sheet
      variant="outlined"
      sx={{
        width,
        borderRadius: "18px",
        borderColor: "rgba(220, 226, 244, 0.95)",
        backgroundColor: "#fff",
        boxShadow: "0 18px 38px rgba(170, 180, 214, 0.1)",
        p: { xs: 1.5, md: 2 },
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography
              level="title-lg"
              sx={{ fontWeight: 600, color: "var(--color-font-primary)" }}
            >
              {title}
            </Typography>
            <Typography level="body-sm" sx={{ mt: 0.35, color: "#60708e" }}>
              {description}
            </Typography>
          </Box>
          {countLabel ? (
            <Chip
              variant="soft"
              sx={{
                borderRadius: "999px",
                fontWeight: 600,
                ...chipSx,
              }}
            >
              {countLabel}
            </Chip>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Sheet>
  );
}
