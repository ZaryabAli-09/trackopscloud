import type { ApiResponse } from "@/lib/api/response";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }), ...init?.headers } });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.message || "Request failed");
  return payload.data as T;
}

export async function apiList<T>(path: string): Promise<{ data: T[]; totalPages: number }> {
  const response = await fetch(path);
  const payload = await response.json() as ApiResponse<T[]>;
  if (!response.ok || !payload.success) throw new Error(payload.message || "Could not load data");
  return { data: payload.data ?? [], totalPages: payload.meta?.totalPages ?? 0 };
}
