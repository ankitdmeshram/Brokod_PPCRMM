import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  showErrorAlert,
  showInfoAlert,
  showSuccessAlert,
} from "../services/alert.service";
import {
  fetchCurrentUser,
  signinUser,
  signupUser,
  updateCurrentUserProfile,
} from "../services/auth.service";
import { AUTH_STORAGE_KEY } from "../config/common";
import { getCookie, removeCookie, setCookie } from "../utils/cookie";

const initialSignInValues = {
  email: "",
  password: "",
  rememberMe: false,
};

const initialSignUpValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
};

const initialAuthStatus = {
  loading: false,
};

const AuthContext = createContext(null);

function readSavedSession() {
  const savedSession = getCookie(AUTH_STORAGE_KEY);

  if (!savedSession) {
    return null;
  }

  try {
    return JSON.parse(savedSession);
  } catch (_error) {
    removeCookie(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [signInValues, setSignInValues] = useState(initialSignInValues);
  const [signUpValues, setSignUpValues] = useState(initialSignUpValues);
  const [authSession, setAuthSession] = useState(readSavedSession);
  const [signInStatus, setSignInStatus] = useState(initialAuthStatus);
  const [signUpStatus, setSignUpStatus] = useState(initialAuthStatus);

  const updateSignInField = (field, value) => {
    setSignInValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const updateSignUpField = (field, value) => {
    setSignUpValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const resetSignIn = () => {
    setSignInValues(initialSignInValues);
    setSignInStatus(initialAuthStatus);
  };
  const resetSignUp = () => {
    setSignUpValues(initialSignUpValues);
    setSignUpStatus(initialAuthStatus);
  };

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
      if (!authSession?.token) {
        return;
      }

      try {
        const result = await fetchCurrentUser(authSession.token);

        if (!result?.user) {
          return;
        }

        const nextSession = {
          ...authSession,
          user: result.user,
        };

        persistAuthSession(nextSession);
      } catch (error) {
        clearAuthSession();
      }
    };

    syncCurrentUser();
  }, [authSession?.token]);

  const submitSignIn = async () => {
    if (!signInValues.email.trim() || !signInValues.password) {
      await showErrorAlert(
        "Missing credentials",
        "Please enter your email and password.",
      );
      return null;
    }

    setSignInStatus({
      loading: true,
    });

    try {
      const result = await signinUser({
        email: signInValues.email,
        password: signInValues.password,
      });

      const sessionPayload = {
        token: result.token,
        user: result.user,
      };

      if (signInValues.rememberMe) {
        setCookie(AUTH_STORAGE_KEY, JSON.stringify(sessionPayload), { days: 7 });
      } else {
        setCookie(AUTH_STORAGE_KEY, JSON.stringify(sessionPayload));
      }

      persistAuthSession(sessionPayload);
      setSignInStatus({
        loading: false,
      });
      setSignInValues(initialSignInValues);

      await showSuccessAlert(
        "Signin successful",
        result.message || "Welcome back.",
      );

      return result;
    } catch (error) {
      setSignInStatus({
        loading: false,
      });
      await showErrorAlert(
        "Signin failed",
        error.message || "Unable to sign in right now.",
      );

      return null;
    }
  };

  const saveCurrentUserProfile = async (payload) => {
    if (!authSession?.token) {
      await showErrorAlert(
        "Session expired",
        "Please sign in again to update your profile."
      );
      return null;
    }

    try {
      const result = await updateCurrentUserProfile(payload, authSession.token);

      if (!result?.user) {
        return null;
      }

      persistAuthSession({
        ...authSession,
        user: result.user,
      });

      await showSuccessAlert(
        "Profile updated",
        result.message || "Your profile has been updated successfully."
      );

      return result.user;
    } catch (error) {
      await showErrorAlert(
        "Unable to update profile",
        error.message || "Something went wrong while updating your profile."
      );
      return null;
    }
  };

  const submitSignUp = async () => {
    if (
      !signUpValues.firstName.trim() ||
      !signUpValues.lastName.trim() ||
      !signUpValues.email.trim() ||
      !signUpValues.phone.trim() ||
      !signUpValues.password
    ) {
      await showErrorAlert(
        "Missing required fields",
        "Please fill in first name, last name, email, phone number, and password.",
      );
      return null;
    }

    if (signUpValues.password !== signUpValues.confirmPassword) {
      await showErrorAlert(
        "Password mismatch",
        "Password and confirm password must match.",
      );
      return null;
    }

    if (!signUpValues.agreeToTerms) {
      await showInfoAlert(
        "Terms required",
        "Please agree to the terms and conditions.",
      );
      return null;
    }

    setSignUpStatus({
      loading: true,
    });

    try {
      const result = await signupUser({
        firstName: signUpValues.firstName,
        lastName: signUpValues.lastName,
        email: signUpValues.email,
        phone: signUpValues.phone,
        password: signUpValues.password,
      });

      setSignUpStatus({
        loading: false,
      });
      setSignUpValues(initialSignUpValues);
      await showSuccessAlert(
        "Signup successful",
        result.message || "Your account has been created successfully.",
      );

      return result;
    } catch (error) {
      setSignUpStatus({
        loading: false,
      });
      await showErrorAlert(
        "Signup failed",
        error.message || "Unable to sign up right now.",
      );

      return null;
    }
  };

  const value = useMemo(
    () => ({
      authSession,
      isAuthenticated: Boolean(authSession?.token),
      signInValues,
      signInStatus,
      signUpValues,
      signUpStatus,
      clearAuthSession,
      updateSignInField,
      updateSignUpField,
      resetSignIn,
      resetSignUp,
      saveCurrentUserProfile,
      submitSignIn,
      submitSignUp,
    }),
    [authSession, signInValues, signInStatus, signUpValues, signUpStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
