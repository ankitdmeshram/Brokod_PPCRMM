import { TASK_API_BASE } from "../config/common";

async function parseApiResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
  }

  return data;
}

export async function createTask(payload, token) {
  const response = await fetch(TASK_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function fetchTasks(token, filters = {}) {
  const query = new URLSearchParams();

  if (filters.projectId) {
    query.set("projectId", String(filters.projectId));
  }

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

  const response = await fetch(`${TASK_API_BASE}${query.toString() ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function fetchTaskById(taskId, token) {
  const response = await fetch(`${TASK_API_BASE}/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function fetchTaskBySlug(taskSlug, token) {
  const response = await fetch(`${TASK_API_BASE}/slug/${taskSlug}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function updateTask(taskId, payload, token) {
  const response = await fetch(`${TASK_API_BASE}/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function deleteTask(taskId, token) {
  const response = await fetch(`${TASK_API_BASE}/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}
