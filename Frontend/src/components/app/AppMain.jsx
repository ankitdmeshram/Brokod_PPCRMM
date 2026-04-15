import { Box } from "@mui/joy";

export default function AppMain({ children }) {
  return (
    <Box
      sx={{
        px: { xs: 0, md: 0 },
        py: 0,
      }}
    >
      {children}
    </Box>
  );
}
