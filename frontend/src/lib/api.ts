import { auth } from "./firebase";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function getBearerHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    authRequired?: boolean;
    formData?: FormData;
  } = {}
): Promise<T> {
  const { method = "GET", body, authRequired = false, formData } = options;
  const authHeader = await getBearerHeader();
  if (authRequired && !authHeader.Authorization) {
    throw new ApiError(401, "You must be signed in to access this resource.");
  }

  const headers: Record<string, string> = { ...authHeader };
  let fetchBody: BodyInit | undefined;
  if (formData) {
    fetchBody = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: fetchBody,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: { detail?: string } = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { detail: text || res.statusText };
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed.detail || `Request failed (${res.status})`);
  }

  return parsed as T;
}
