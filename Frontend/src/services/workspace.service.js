import { WORKSPACE_API_BASE } from "../config/common";

async function parseApiResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
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

export async function deleteWorkspace(workspaceId, token) {
  const response = await fetch(`${WORKSPACE_API_BASE}/${workspaceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
}
