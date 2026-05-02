import { PROJECT_API_BASE } from "../config/common";

async function parseApiResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
  }

  return data;
}

export async function fetchProjects(token, filters = {}) {
  const query = new URLSearchParams();

  if (filters.workspaceId) {
    query.set("workspaceId", String(filters.workspaceId));
  }

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.page) {
    query.set("page", String(filters.page));
  }

  if (filters.limit) {
    query.set("limit", String(filters.limit));
  }

  const response = await fetch(`${PROJECT_API_BASE}${query.toString() ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function createProject(payload, token) {
  const response = await fetch(PROJECT_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function fetchProjectById(projectId, token) {
  const response = await fetch(`${PROJECT_API_BASE}/${projectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function fetchProjectUsers(projectId, token) {
  const response = await fetch(`${PROJECT_API_BASE}/${projectId}/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function updateProject(projectId, payload, token) {
  const response = await fetch(`${PROJECT_API_BASE}/${projectId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function deleteProject(projectId, token) {
  const response = await fetch(`${PROJECT_API_BASE}/${projectId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}
