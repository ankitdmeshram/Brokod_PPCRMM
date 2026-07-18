/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "../config/common";
import { showErrorAlert, showSuccessAlert } from "../services/alert.service";
import {
  fetchCurrentUser,
  updateCurrentUserProfile,
} from "../services/auth.service";
import { getCookie, removeCookie, setCookie } from "../utils/cookie";

const AuthContext = createContext(null);

function readSavedSession() {
  const savedSession = getCookie(AUTH_STORAGE_KEY);

  if (!savedSession) {
    return null;
  }

  try {
    return JSON.parse(savedSession);
  } catch {
    removeCookie(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [authSession, setAuthSession] = useState(readSavedSession);
  const authToken = authSession?.token;

  const clearAuthSession = () => {
    removeCookie(AUTH_STORAGE_KEY);
    setAuthSession(null);
  };

  const persistAuthSession = (nextSession) => {
    setAuthSession(nextSession);
    setCookie(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
  };

  useEffect(() => {
    const syncCurrentUser = async () => {
      if (!authToken) {
        return;
      }

      try {
        const result = await fetchCurrentUser(authToken);

        if (result?.user) {
          setAuthSession((currentSession) => {
            if (!currentSession || currentSession.token !== authToken) {
              return currentSession;
            }

            const nextSession = { ...currentSession, user: result.user };
            setCookie(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
            return nextSession;
          });
        }
      } catch {
        removeCookie(AUTH_STORAGE_KEY);
        setAuthSession(null);
      }
    };

    void syncCurrentUser();
  }, [authToken]);

  const saveCurrentUserProfile = async (payload) => {
    if (!authSession?.token) {
      await showErrorAlert(
        "Session expired",
        "Please sign in again to update your profile.",
      );
      return null;
    }

    try {
      const result = await updateCurrentUserProfile(payload, authSession.token);

      if (!result?.user) {
        return null;
      }

      persistAuthSession({ ...authSession, user: result.user });
      await showSuccessAlert(
        "Profile updated",
        result.message || "Your profile has been updated successfully.",
      );
      return result.user;
    } catch (error) {
      await showErrorAlert(
        "Unable to update profile",
        error.message || "Something went wrong while updating your profile.",
      );
      return null;
    }
  };

  const value = {
    authSession,
    isAuthenticated: Boolean(authSession?.token),
    clearAuthSession,
    saveCurrentUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
