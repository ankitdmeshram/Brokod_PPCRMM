const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const request = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong while contacting the server.");
  }

  return data;
};

const signupUser = (payload) =>
  request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

const signinUser = (payload) =>
  request("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  });

const getCurrentUser = (token) =>
  request("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export { getCurrentUser, signinUser, signupUser };
