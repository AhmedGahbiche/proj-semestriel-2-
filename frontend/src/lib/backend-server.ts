import "server-only";

type BackendFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string | undefined>;
  admin?: boolean;
};

const backendUrl = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

function requireAdminKey(): string {
  const key = process.env.BACKEND_ADMIN_API_KEY;
  if (!key) {
    throw new Error(
      "Missing BACKEND_ADMIN_API_KEY. Set it in frontend/.env.local (use the same value as backend ADMIN_BOOTSTRAP_KEY for local dev).",
    );
  }
  return key;
}

export async function backendFetch(path: string, options: BackendFetchOptions = {}): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${backendUrl}${normalizedPath}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(options.headers ?? {})) {
    if (typeof v === "string" && v.length) headers.set(k, v);
  }

  if (options.admin) {
    headers.set("X-API-Key", requireAdminKey());
  }

  // Always avoid caching for live dashboard data.
  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  return res;
}

export async function backendJson<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const res = await backendFetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ""}`);
  }
  return (await res.json()) as T;
}
