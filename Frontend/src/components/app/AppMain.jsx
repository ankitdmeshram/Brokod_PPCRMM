import { Box } from "@mui/joy";

export default function AppMain({ children }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        px: { xs: 0, md: 0 },
        py: 0,
        overflowX: "hidden",
      }}
    >
      {children}
    </Box>
  );
}
