import { Sheet, Stack, Typography } from "@mui/joy";

export default function QuotePanel() {
  return (
    <Sheet
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2.5, sm: 4 },
        py: { xs: 4, sm: 5 },
        borderRadius: 0,
        backgroundColor: "var(--color-primary)",
        color: "var(--color-font-secondary)",
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 320 }}>
        <Typography
          level="h3"
          sx={{
            fontSize: { xs: "1.4rem", sm: "1.6rem" },
            fontWeight: 700,
            color: "var(--color-font-secondary)",
          }}
        >
          Every new day is another chance to build something worth being proud of.
        </Typography>
        <Typography level="body-md" sx={{ color: "var(--color-font-secondary)" }}>
          Show up, do the work, and let consistency speak louder than doubt.
        </Typography>
      </Stack>
    </Sheet>
  );
}
