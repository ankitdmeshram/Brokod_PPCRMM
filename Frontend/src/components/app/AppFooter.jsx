import { Sheet, Typography } from "@mui/joy";

export default function AppFooter({ currentYear }) {
  return (
    <Sheet
      sx={{
        px: { xs: 2, md: 3 },
        display: "flex",
        alignItems: "center",
        borderTop: "1px solid rgba(198, 205, 228, 0.7)",
        backgroundColor: "#fff",
      }}
    >
      <Typography level="body-sm" sx={{ color: "var(--color-font-secondary)" }}>
        {currentYear} (c) Brokod.
      </Typography>
    </Sheet>
  );
}
