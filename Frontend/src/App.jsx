import { useMemo, useState } from "react";

import "./App.css";

import { useAuth } from "./context/AuthContext";

const initialSignupForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
};

const initialSigninForm = {
  email: "",
  password: "",
};

const formatLastLogin = (value) => {
  if (!value) {
    return "First session";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

function App() {
  const [activeView, setActiveView] = useState("signin");
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [signinForm, setSigninForm] = useState(initialSigninForm);
  const [rememberMe, setRememberMe] = useState(true);
  const {
    currentUser,
    feedback,
    isAuthenticated,
    isInitializing,
    isSubmitting,
    signin,
    signout,
    signup,
    token,
  } = useAuth();

  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
    [],
  );

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((current) => ({ ...current, [name]: value }));
  };

  const handleSigninChange = (event) => {
    const { name, value } = event.target;
    setSigninForm((current) => ({ ...current, [name]: value }));
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    try {
      await signup(signupForm);
      setSignupForm(initialSignupForm);
      setSigninForm((current) => ({ ...current, email: signupForm.email, password: "" }));
      setActiveView("signin");
    } catch (_error) {}
  };

  const handleSigninSubmit = async (event) => {
    event.preventDefault();

    try {
      await signin(signinForm);
      setSigninForm(initialSigninForm);
    } catch (_error) {}
  };

  const handleSignout = () => {
    signout();
    setActiveView("signin");
  };

  return (
    <div className="shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="app-layout">
        {!isAuthenticated ? (
          <section className="auth-stage">
            <div className="auth-card">
              <div className="auth-card-inner">
                <div className="form-header auth-center">
                  <h2>{activeView === "signin" ? "Welcome Back !" : "Create Account"}</h2>
                  <p>
                    {activeView === "signin"
                      ? "Sign in to continue"
                      : "Create your account to continue"}
                  </p>
                </div>

                {feedback.type !== "idle" ? (
                  <div className={`feedback feedback-${feedback.type}`}>
                    <span className="feedback-dot" />
                    <p>{feedback.message}</p>
                  </div>
                ) : null}

                {activeView === "signup" ? (
                  <form className="auth-form auth-form-compact" onSubmit={handleSignupSubmit}>
                    <div className="field-grid">
                      <label className="field">
                        <span>First Name</span>
                        <input
                          name="firstName"
                          value={signupForm.firstName}
                          onChange={handleSignupChange}
                          placeholder="Enter first name"
                          autoComplete="given-name"
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Last Name</span>
                        <input
                          name="lastName"
                          value={signupForm.lastName}
                          onChange={handleSignupChange}
                          placeholder="Enter last name"
                          autoComplete="family-name"
                          required
                        />
                      </label>

                      <label className="field field-full">
                        <span>Email</span>
                        <input
                          type="email"
                          name="email"
                          value={signupForm.email}
                          onChange={handleSignupChange}
                          placeholder="Enter email"
                          autoComplete="email"
                          required
                        />
                      </label>

                      <label className="field field-full">
                        <span>Phone</span>
                        <input
                          name="phone"
                          value={signupForm.phone}
                          onChange={handleSignupChange}
                          placeholder="Enter phone number"
                          autoComplete="tel"
                          required
                        />
                      </label>

                      <label className="field field-full">
                        <span>Password</span>
                        <input
                          type="password"
                          name="password"
                          value={signupForm.password}
                          onChange={handleSignupChange}
                          placeholder="Create password"
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                      </label>
                    </div>

                    <button className="primary-button" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating account..." : "Sign Up"}
                    </button>
                  </form>
                ) : (
                  <form className="auth-form auth-form-compact" onSubmit={handleSigninSubmit}>
                    <div className="field-grid compact-grid">
                      <label className="field field-full">
                        <span>Email</span>
                        <input
                          type="email"
                          name="email"
                          value={signinForm.email}
                          onChange={handleSigninChange}
                          placeholder="Enter email"
                          autoComplete="email"
                          required
                        />
                      </label>

                      <label className="field field-full">
                        <span>Password</span>
                        <input
                          type="password"
                          name="password"
                          value={signinForm.password}
                          onChange={handleSigninChange}
                          placeholder="Enter password"
                          autoComplete="current-password"
                          required
                        />
                      </label>
                    </div>

                    <label className="remember-row">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe((current) => !current)}
                      />
                      <span>Remember me</span>
                    </label>

                    <button className="primary-button" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Signing in..." : "Sign In"}
                    </button>
                  </form>
                )}

                <div className="form-switch">
                  <span>
                    {activeView === "signin"
                      ? "Don't have an account ?"
                      : "Already have an account ?"}
                  </span>
                  <button
                    type="button"
                    className="switch-link"
                    onClick={() =>
                      setActiveView((current) => (current === "signin" ? "signup" : "signin"))
                    }
                  >
                    {activeView === "signin" ? "Signup" : "Signin"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="profile-stage">
            <section className="profile-card profile-card-centered">
              <div className="profile-header">
                <div>
                  <p className="profile-label">Current session</p>
                  <h2>
                    {isInitializing
                      ? "Refreshing your profile..."
                      : `${currentUser?.firstName || "User"} ${currentUser?.lastName || ""}`.trim()}
                  </h2>
                </div>

                <button type="button" className="ghost-button" onClick={handleSignout}>
                  Sign out
                </button>
              </div>

              <div className="profile-grid">
                <article className="profile-item">
                  <span>Email</span>
                  <strong>{currentUser?.email || "Loading..."}</strong>
                </article>
                <article className="profile-item">
                  <span>Phone</span>
                  <strong>{currentUser?.phone || "Loading..."}</strong>
                </article>
                <article className="profile-item">
                  <span>Role</span>
                  <strong>{currentUser?.role || "user"}</strong>
                </article>
                <article className="profile-item">
                  <span>Status</span>
                  <strong>{currentUser?.isActive ? "Active" : "Inactive"}</strong>
                </article>
                <article className="profile-item">
                  <span>Last login</span>
                  <strong>{formatLastLogin(currentUser?.lastLogin)}</strong>
                </article>
                <article className="profile-item">
                  <span>Token state</span>
                  <strong>{token ? "Stored locally" : "Missing"}</strong>
                </article>
              </div>

              <div className="profile-footer">
                <p>
                  API target: <code>{apiBaseUrl}</code>
                </p>
                <a href={`${apiBaseUrl}/api-docs`} target="_blank" rel="noreferrer">
                  Review backend API docs
                </a>
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
