import { Box, Link, Sheet, Stack, Typography } from "@mui/joy";
import { Link as RouterLink } from "react-router-dom";
import SignInForm from "../components/auth/SignInForm";
import SignUpForm from "../components/auth/SignUpForm";
import { AUTH_ROUTES } from "../config/app.config";

export default function AuthPage({ mode }) {
  const isSignUp = mode === "signup";

  return (
    <Box className="auth-background">
      <Sheet variant="outlined" className="auth-card">
        <Box className={isSignUp ? "auth-grid auth-grid--compact" : "auth-grid"}>
          {!isSignUp && (
            <Box className="auth-visual">
              <Box className="visual-orbit visual-orbit--one" />
              <Box className="visual-orbit visual-orbit--two" />
              <Typography level="h1" sx={{ color: "#fff", fontWeight: 800, zIndex: 1 }}>
                Build together.
              </Typography>
              <Typography level="body-lg" sx={{ color: "rgba(255,255,255,.82)", zIndex: 1 }}>
                Keep projects, people, and progress in one place.
              </Typography>
            </Box>
          )}
          <Sheet className="auth-form-panel">
            <Stack spacing={isSignUp ? 2.25 : 3}>
              <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
                <Typography level="h2" sx={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  {isSignUp ? "Create Account" : "Welcome Back !"}
                </Typography>
                <Typography level="body-md" sx={{ color: "#637393" }}>
                  {isSignUp ? "Sign up to get started" : "Sign in to continue"}
                </Typography>
              </Stack>
              {isSignUp ? <SignUpForm /> : <SignInForm />}
              <Typography level="body-md" sx={{ textAlign: "center" }}>
                {isSignUp ? "Already have an account ? " : "Don't have an account ? "}
                <Link
                  component={RouterLink}
                  to={isSignUp ? AUTH_ROUTES.signIn : AUTH_ROUTES.signUp}
                  underline="none"
                  sx={{ fontWeight: 700 }}
                >
                  {isSignUp ? "Sign In" : "Signup"}
                </Link>
              </Typography>
            </Stack>
          </Sheet>
        </Box>
      </Sheet>
    </Box>
  );
}
