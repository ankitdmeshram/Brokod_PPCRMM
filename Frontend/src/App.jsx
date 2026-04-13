import { CssVarsProvider } from "@mui/joy";
import CssBaseline from "@mui/joy/CssBaseline";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthRedirect from "./components/auth/AuthRedirect";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import WorkspacePage from "./pages/WorkspacePage";
import { APP_ROUTES, AUTH_ROUTES } from "./router/authRoutes";
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
              <AuthRedirect>
                <AuthPage mode="signin" />
              </AuthRedirect>
            }
          />
          <Route
            path={AUTH_ROUTES.signUp}
            element={
              <AuthRedirect>
                <AuthPage mode="signup" />
              </AuthRedirect>
            }
          />
          <Route
            path={`${APP_ROUTES.workspace}/*`}
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={AUTH_ROUTES.signIn} replace />} />
        </Routes>
      </AuthProvider>
    </CssVarsProvider>
  );
}
