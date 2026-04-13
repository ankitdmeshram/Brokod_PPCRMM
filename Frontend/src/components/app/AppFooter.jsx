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
      <Typography level="body-sm" sx={{ color: "#5b6b8a" }}>
        {currentYear} (c) Brokod.
      </Typography>
    </Sheet>
  );
}
