import { WORKSPACE_API_BASE } from "../config/common";

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

export async function createWorkspace(payload, token) {
  const response = await fetch(WORKSPACE_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function updateWorkspace(workspaceId, payload, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function fetchWorkspaces(token) {
  const response = await fetch(WORKSPACE_API_BASE, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function fetchWorkspaceUsers(workspaceId, token, filters = {}) {
  const query = new URLSearchParams();

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.page) {
    query.set("page", String(filters.page));
  }

  if (filters.limit) {
    query.set("limit", String(filters.limit));
  }

  const response = await fetch(
    `${WORKSPACE_API_BASE}/${workspaceId}/users${query.toString() ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseApiResponse(response);
}

export async function fetchAllWorkspaceUsers(workspaceId, token, filters = {}) {
  const aggregatedUsers = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchWorkspaceUsers(workspaceId, token, {
      ...filters,
      page,
      limit: 100,
    });

    const pageUsers = Array.isArray(result?.users) ? result.users : [];
    aggregatedUsers.push(...pageUsers);

    totalPages = Math.max(1, Number(result?.pagination?.totalPages || 1));
    page += 1;
  }

  return aggregatedUsers;
}

export async function inviteWorkspaceUser(workspaceId, payload, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function updateWorkspaceUser(workspaceId, userId, payload, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function deleteWorkspaceUser(workspaceId, userId, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}

export async function updateWorkspaceUserStatus(workspaceId, userId, status, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}/users/${userId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  return parseApiResponse(response);
}

export async function deleteWorkspace(workspaceId, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}
