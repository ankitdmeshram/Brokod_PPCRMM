import { AUTH_TRAILS_API_URL } from "../config/common";

async function parseApiResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
  }

  return data;
}

const dateFilterKeys = new Set(["createdAt", "createdFrom", "createdTo"]);

export async function fetchAuthTrails(token, filters = {}) {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return;
    }

    const normalizedValue = dateFilterKeys.has(key)
      ? new Date(value).toISOString()
      : String(value).trim();

    query.set(key, normalizedValue);
  });

  const response = await fetch(
    `${AUTH_TRAILS_API_URL}${query.toString() ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseApiResponse(response);
}
