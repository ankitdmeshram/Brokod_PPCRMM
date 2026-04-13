const DEFAULT_PATH = "/";

function encodeCookieValue(value) {
  return encodeURIComponent(value);
}

function decodeCookieValue(value) {
  return decodeURIComponent(value);
}

export function setCookie(name, value, options = {}) {
  const {
    days,
    path = DEFAULT_PATH,
    sameSite = "Lax",
    secure = window.location.protocol === "https:",
  } = options;

  let cookie = `${name}=${encodeCookieValue(value)}; path=${path}; SameSite=${sameSite}`;

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

  if (!cookie) {
    return null;
  }

  return decodeCookieValue(cookie.slice(cookiePrefix.length));
}

export function removeCookie(name, options = {}) {
  setCookie(name, "", { ...options, days: -1 });
}
