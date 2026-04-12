import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, signinUser, signupUser } from "../lib/api";

const tokenStorageKey = "brokod.auth.token";

const AuthContext = createContext(null);

const readStoredToken = () => window.localStorage.getItem(tokenStorageKey) || "";

const persistToken = (token) => {
  if (!token) {
    window.localStorage.removeItem(tokenStorageKey);
    return;
  }

  window.localStorage.setItem(tokenStorageKey, token);
};

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(readStoredToken()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "idle",
    message: "Create an account or sign in to continue.",
  });

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setIsInitializing(false);
      return;
    }

    let isMounted = true;

    const loadUser = async () => {
      setIsInitializing(true);

      try {
        const result = await getCurrentUser(token);

        if (!isMounted) {
          return;
        }

        setCurrentUser(result.user);
        setFeedback({
          type: "success",
          message: "You are signed in and ready to work.",
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        persistToken("");
        setToken("");
        setCurrentUser(null);
        setFeedback({
          type: "error",
          message: error.message || "Your session has expired. Please sign in again.",
        });
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const signup = useCallback(async (payload) => {
    setIsSubmitting(true);

    try {
      const result = await signupUser(payload);

      setFeedback({
        type: "success",
        message: `${result.user.firstName}, your account is ready. Sign in to continue.`,
      });

      return result;
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Unable to create your account right now.",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signin = useCallback(async (payload) => {
    setIsSubmitting(true);

    try {
      const result = await signinUser(payload);

      persistToken(result.token);
      setToken(result.token);
      setCurrentUser(result.user);
      setFeedback({
        type: "success",
        message: `Welcome back, ${result.user.firstName}.`,
      });

      return result;
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Signin failed. Please try again.",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signout = useCallback(() => {
    persistToken("");
    setToken("");
    setCurrentUser(null);
    setFeedback({
      type: "idle",
      message: "You have signed out cleanly.",
    });
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      feedback,
      isAuthenticated: Boolean(token),
      isInitializing,
      isSubmitting,
      setFeedback,
      signin,
      signout,
      signup,
      token,
    }),
    [currentUser, feedback, isInitializing, isSubmitting, signin, signout, signup, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};

export { AuthProvider, useAuth };
