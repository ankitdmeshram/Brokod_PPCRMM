import { CssVarsProvider } from "@mui/joy";
import CssBaseline from "@mui/joy/CssBaseline";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import { AUTH_ROUTES } from "./router/authRoutes";
import { joyTheme } from "./theme/joyTheme";

export default function App() {
  return (
    <CssVarsProvider theme={joyTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path={AUTH_ROUTES.signIn} element={<AuthPage mode="signin" />} />
          <Route path={AUTH_ROUTES.signUp} element={<AuthPage mode="signup" />} />
          <Route path="*" element={<Navigate to={AUTH_ROUTES.signIn} replace />} />
        </Routes>
      </AuthProvider>
    </CssVarsProvider>
  );
}
