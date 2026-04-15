import { Link, Typography } from "@mui/joy";
import { Link as RouterLink } from "react-router-dom";

export default function AuthSwitchLink({ isSignUp, href }) {
  return (
    <Typography
      level="body-md"
      sx={{ textAlign: "center", color: "var(--color-font-primary)", pt: 0.5 }}
    >
      {isSignUp ? "Already have an account ? " : "Don't have an account ? "}
      <Link
        component={RouterLink}
        to={href}
        underline="none"
        sx={{
          fontWeight: 700,
          color: "var(--color-primary)",
          "&:hover": {
            color: "var(--color-secondary)",
          },
        }}
      >
        {isSignUp ? "Sign In" : "Signup"}
      </Link>
    </Typography>
  );
}
