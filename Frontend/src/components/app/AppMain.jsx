import { Box } from "@mui/joy";

export default function AppMain({ children }) {
  return <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>{children}</Box>;
}
