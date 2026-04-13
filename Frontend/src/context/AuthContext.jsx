import { createContext, useContext, useMemo, useState } from "react";
import {
  showErrorAlert,
  showInfoAlert,
  showSuccessAlert,
} from "../services/alert.service";
import { signinUser, signupUser } from "../services/auth.service";
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

export function AuthProvider({ children }) {
  const [signInValues, setSignInValues] = useState(initialSignInValues);
  const [signUpValues, setSignUpValues] = useState(initialSignUpValues);
  const [authSession, setAuthSession] = useState(() => {
    const savedSession = getCookie(AUTH_STORAGE_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  });
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

      setAuthSession(sessionPayload);
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
