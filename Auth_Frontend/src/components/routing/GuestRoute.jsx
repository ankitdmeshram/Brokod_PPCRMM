import { AUTH_STORAGE_KEY, getSafeProductRedirect } from "../../config/app.config";
import { getCookie } from "../../utils/cookie";

export default function GuestRoute({ children }) {
  const savedSession = getCookie(AUTH_STORAGE_KEY);

  if (savedSession) {
    try {
      if (JSON.parse(savedSession)?.token) {
        window.location.replace(getSafeProductRedirect());
        return null;
      }
    } catch {
      // A successful sign-in replaces malformed session data.
    }
  }

  return children;
}
