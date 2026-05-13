import { TASK_API_BASE } from "../config/common";

async function parseApiResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Something went wrong. Please try again.");
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

function appendTaskQueryParams(query, filters = {}) {
  const filterKeys = [
    "search",
    "id",
    "title",
    "status",
    "priority",
    "dueDate",
    "assignedTo",
    "assignedBy",
    "tags",
    "updatedAt",
    "createdAt",
  ];

  if (filters.projectId) {
    query.set("projectId", String(filters.projectId));
  }

  if (filters.workspaceId) {
    query.set("workspaceId", String(filters.workspaceId));
  }

  filterKeys.forEach((key) => {
    if (filters[key]?.trim()) {
      query.set(key, filters[key].trim());
    }
  });

  if (Array.isArray(filters.advancedFilters) && filters.advancedFilters.length > 0) {
    query.set("advancedFilters", JSON.stringify(filters.advancedFilters));
  }
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
  appendTaskQueryParams(query, filters);

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

export async function fetchAllTasks(token, filters = {}) {
  const aggregatedTasks = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchTasks(token, {
      ...filters,
      page,
      limit: 100,
    });

    const pageTasks = Array.isArray(result?.tasks) ? result.tasks : [];
    aggregatedTasks.push(...pageTasks);

    totalPages = Math.max(1, Number(result?.pagination?.totalPages || 1));
    page += 1;
  }

  return aggregatedTasks;
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

export async function fetchTaskBySlug(taskSlug, token, options = {}) {
  const query = new URLSearchParams();

  if (options.projectId) {
    query.set("projectId", String(options.projectId));
  }

  const response = await fetch(`${TASK_API_BASE}/slug/${taskSlug}${query.toString() ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function fetchTaskComments(taskId, token) {
  const response = await fetch(`${TASK_API_BASE}/${taskId}/comments`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function createTaskComment(taskId, payload, token) {
  const response = await fetch(`${TASK_API_BASE}/${taskId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function updateTaskComment(taskId, commentId, payload, token) {
  const response = await fetch(`${TASK_API_BASE}/${taskId}/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
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

function parseFileNameFromDisposition(contentDisposition = "") {
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  if (standardMatch?.[1]) {
    return standardMatch[1];
  }

  return "tasks.json";
}

export async function exportTasksJson(token, filters = {}) {
  const query = new URLSearchParams();
  appendTaskQueryParams(query, filters);

  const response = await fetch(`${TASK_API_BASE}/export/json${query.toString() ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return parseApiResponse(response);
  }

  const blob = await response.blob();

  return {
    blob,
    fileName: parseFileNameFromDisposition(response.headers.get("content-disposition") || ""),
  };
}

export async function importTasksJson(token, payload) {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("projectId", String(payload.projectId));

  if (payload.workspaceId) {
    formData.append("workspaceId", String(payload.workspaceId));
  }

  const response = await fetch(`${TASK_API_BASE}/import/json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseApiResponse(response);
}
