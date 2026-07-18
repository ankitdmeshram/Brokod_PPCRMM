import { CssVarsProvider } from "@mui/joy";
import CssBaseline from "@mui/joy/CssBaseline";
import { Navigate, Route, Routes } from "react-router-dom";
import GuestRoute from "./components/routing/GuestRoute";
import { AUTH_ROUTES } from "./config/app.config";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import { joyTheme } from "./theme/joyTheme";

export default function App() {
  return (
    <CssVarsProvider theme={joyTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route
            path={AUTH_ROUTES.signIn}
            element={
              <GuestRoute>
                <AuthPage mode="signin" />
              </GuestRoute>
            }
          />
          <Route
            path={AUTH_ROUTES.signUp}
            element={
              <GuestRoute>
                <AuthPage mode="signup" />
              </GuestRoute>
            }
          />
          <Route path="*" element={<Navigate to={AUTH_ROUTES.signIn} replace />} />
        </Routes>
      </AuthProvider>
    </CssVarsProvider>
  );
}
