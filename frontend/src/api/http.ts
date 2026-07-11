import { API_BASE_URL } from "@/config";

/**
 * Normalized API error. Every service rejects with one of these so components
 * can render consistent error states regardless of backend quirks.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

/** Auth token accessor — set by the auth layer so http calls stay decoupled. */
let getToken: () => string | null = () => null;
export function registerTokenProvider(fn: () => string | null) {
  getToken = fn;
}

/**
 * Called when the server rejects our token (expired/invalid). The auth layer
 * registers a handler that clears the session and bounces to /login, so an
 * expired token never leaves the user staring at silent failures.
 */
let onUnauthorized: () => void = () => {};
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Query params serialized onto the URL. */
  params?: Record<string, string | number | undefined>;
}

/**
 * Thin typed fetch wrapper. The ONLY module that talks to `fetch` for the real
 * backend. Handles base URL, auth header, JSON (de)serialization, and error
 * normalization in one place.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers, ...rest } = options;

  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const token = getToken();
  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    // FastAPI returns errors as { detail: string | [...] }.
    const body = parsed as { detail?: unknown; message?: string } | undefined;
    const detail = body?.detail;
    const message =
      (typeof detail === "string" ? detail : undefined) ??
      body?.message ??
      (Array.isArray(detail) ? "Some fields are invalid." : undefined) ??
      `Request failed (${res.status})`;

    // An expired/invalid token anywhere in the app ends the session once.
    // (Login itself returns 401 for bad credentials — don't nuke the session
    // for that; the user has no session to lose.)
    if (res.status === 401 && !path.startsWith("/auth/login")) {
      onUnauthorized();
    }

    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

/**
 * Multipart upload. Separate from request() because the browser must set the
 * multipart boundary itself — forcing Content-Type: application/json here would
 * make FastAPI reject the file.
 */
export async function upload<T>(path: string, file: File, field = "file"): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  const form = new FormData();
  form.append(field, file);

  const token = getToken();
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const body = parsed as { detail?: unknown } | undefined;
    const message =
      typeof body?.detail === "string" ? body.detail : `Upload failed (${res.status})`;
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
