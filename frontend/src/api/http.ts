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

  // FormData (file uploads) must NOT be JSON-encoded, and the browser has to
  // set its own multipart Content-Type (with boundary) so that we can omit ours.
  const isFormData = body instanceof FormData;

  const token = getToken();
  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    // FastAPI returns errors as `{ detail: ... }`; some other backends use
    // `{ message: ... }`. Try both before falling back to a generic string.
    const p = parsed as { message?: string; detail?: unknown } | undefined;
    const message =
      p?.message ??
      (typeof p?.detail === "string" ? p.detail : undefined) ??
      `Request failed (${res.status})`;
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
