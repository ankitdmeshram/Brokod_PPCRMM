/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import { showErrorAlert, showInfoAlert, showSuccessAlert } from "../services/alert.service";
import { signinUser, signupUser } from "../services/auth.service";
import { AUTH_STORAGE_KEY, getSafeProductRedirect } from "../config/app.config";
import { setCookie } from "../utils/cookie";

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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [signInValues, setSignInValues] = useState(initialSignInValues);
  const [signUpValues, setSignUpValues] = useState(initialSignUpValues);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const updateSignInField = (field, value) => {
    setSignInValues((current) => ({ ...current, [field]: value }));
  };

  const updateSignUpField = (field, value) => {
    setSignUpValues((current) => ({ ...current, [field]: value }));
  };

  const submitSignIn = async () => {
    if (!signInValues.email.trim() || !signInValues.password) {
      await showErrorAlert(
        "Missing credentials",
        "Please enter your email and password.",
      );
      return false;
    }

    setSignInLoading(true);

    try {
      const result = await signinUser({
        email: signInValues.email,
        password: signInValues.password,
      });
      const session = JSON.stringify({ token: result.token, user: result.user });

      setCookie(AUTH_STORAGE_KEY, session, {
        days: signInValues.rememberMe ? 7 : undefined,
      });
      setSignInValues(initialSignInValues);
      await showSuccessAlert(
        "Signin successful",
        result.message || "Welcome back.",
      );
      window.location.replace(getSafeProductRedirect());
      return true;
    } catch (error) {
      await showErrorAlert(
        "Signin failed",
        error.message || "Unable to sign in right now.",
      );
      return false;
    } finally {
      setSignInLoading(false);
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
      return false;
    }

    if (signUpValues.password !== signUpValues.confirmPassword) {
      await showErrorAlert(
        "Password mismatch",
        "Password and confirm password must match.",
      );
      return false;
    }

    if (!signUpValues.agreeToTerms) {
      await showInfoAlert(
        "Terms required",
        "Please agree to the terms and conditions.",
      );
      return false;
    }

    setSignUpLoading(true);

    try {
      const result = await signupUser({
        firstName: signUpValues.firstName,
        lastName: signUpValues.lastName,
        email: signUpValues.email,
        phone: signUpValues.phone,
        password: signUpValues.password,
      });
      setSignUpValues(initialSignUpValues);
      await showSuccessAlert(
        "Signup successful",
        result.message || "Your account has been created successfully.",
      );
      return true;
    } catch (error) {
      await showErrorAlert(
        "Signup failed",
        error.message || "Unable to sign up right now.",
      );
      return false;
    } finally {
      setSignUpLoading(false);
    }
  };

  const value = {
    signInValues,
    signInLoading,
    signUpValues,
    signUpLoading,
    updateSignInField,
    updateSignUpField,
    submitSignIn,
    submitSignUp,
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
