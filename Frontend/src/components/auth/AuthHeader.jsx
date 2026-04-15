import { Stack, Typography } from "@mui/joy";

export default function AuthHeader({ title, subtitle }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
      <Typography
        level="h2"
        sx={{
          fontSize: { xs: "1.75rem", sm: "1.875rem" },
          fontWeight: 600,
          color: "var(--color-primary)",
        }}
      >
        {title}
      </Typography>
      <Typography level="body-md" sx={{ color: "#637393" }}>
        {subtitle}
      </Typography>
    </Stack>
  );
}
