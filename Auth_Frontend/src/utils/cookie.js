const DEFAULT_PATH = "/";


export function setCookie(name, value, options = {}) {
  const {
    days,
    path = DEFAULT_PATH,
    sameSite = "Lax",
    secure = window.location.protocol === "https:",
  } = options;
  let cookie = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;

  if (typeof days === "number") {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    cookie += `; expires=${expiresAt.toUTCString()}`;
  }

  if (secure) {
    cookie += "; Secure";
  }

  document.cookie = cookie;
}

export function getCookie(name) {
  const cookiePrefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(cookiePrefix));

  return cookie ? decodeURIComponent(cookie.slice(cookiePrefix.length)) : null;
}
