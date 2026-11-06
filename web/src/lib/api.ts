// The ONLY place the UI gets data from: typed calls to the Kontor core API (FastAPI).
//
// - Every function runs on the Next.js SERVER (pages, layouts, server actions, routes).
// - Each call carries the signed-in user's OpenID Connect access token. The API verifies
//   it and decides what this person may see: tenant isolation, roles, validation and
//   ids all live in the core API. This file only fetches.
// - The request/response types are generated from the API (see types.ts).

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import createClient from "openapi-fetch";
import type { paths } from "./api-types";
import { readSession } from "./auth/session";
import type {
  Conversation,
  Dashboard,
  Me,
  NewSupportIssue,
  SecurityOverview,
  SupportIssue,
  TenantRef,
} from "./types";

const BASE_URL = process.env.KONTOR_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function clientFor(token: string) {
  return createClient<paths>({ baseUrl: BASE_URL, headers: { Authorization: `Bearer ${token}` } });
}

/** A client acting as the signed-in user. No session → back to the sign-in page. */
async function api() {
  const jar = await cookies();
  const session = await readSession((name) => jar.get(name)?.value);
  if (!session) redirect("/login");
  return clientFor(session.accessToken);
}

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

// Turn a network failure or a non-2xx response into an ApiError with a readable message.
async function call<T>(request: Promise<ApiResult<T>>): Promise<T> {
  let result: ApiResult<T>;
  try {
    result = await request;
  } catch {
    throw new ApiError(503, `The Kontor API isn't reachable at ${BASE_URL}. Is it running?`);
  }
  // The token was rejected (expired session, account removed): sign in again.
  if (result.response.status === 401) redirect("/login?error=session_expired");
  if (result.data === undefined) {
    throw new ApiError(result.response.status, describe(result.error, result.response.status));
  }
  return result.data;
}

function describe(error: unknown, status: number): string {
  if (error && typeof error === "object" && "detail" in error && typeof error.detail === "string") {
    return error.detail;
  }
  return `The Kontor API answered with status ${status}.`;
}

// ── Sign-in bookkeeping (called by the /auth routes with a fresh token) ──

/** Tell the API about a sign-in or sign-out. Returns the HTTP status (0 = unreachable). */
export async function recordSessionEvent(
  accessToken: string,
  event: "signed_in" | "signed_out",
): Promise<number> {
  try {
    const { response } = await clientFor(accessToken).POST("/me/session-events", {
      body: { event },
    });
    return response.status;
  } catch {
    return 0;
  }
}

// ── Anyone signed in ────────────────────────────────────────

/** The signed-in user (tenant staff or platform staff). */
export async function getCurrentUser(): Promise<Me> {
  return call((await api()).GET("/me"));
}

// ── Tenant portal ───────────────────────────────────────────

/** The signed-in tenant user, with their tenant. */
export async function getMe(): Promise<Me & { tenant: TenantRef }> {
  const me = await getCurrentUser();
  if (!me.tenant) throw new ApiError(403, "This page is for tenant staff.");
  return { ...me, tenant: me.tenant };
}

/** The first 100 conversations, newest first (the API pages with a cursor). */
export async function getConversations(): Promise<Conversation[]> {
  const page = await call(
    (await api()).GET("/conversations", { params: { query: { limit: 100 } } }),
  );
  return page.items;
}

export async function getDashboard(): Promise<Dashboard> {
  return call((await api()).GET("/dashboard"));
}

/** Tenant admins only; the API answers 403 for operators. */
export async function getSecurity(): Promise<SecurityOverview> {
  return call((await api()).GET("/security"));
}

export async function getSupportIssues(): Promise<SupportIssue[]> {
  return call((await api()).GET("/support-issues"));
}

export type CreateIssueResult =
  | { ok: true; issue: SupportIssue }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

/** Create a support issue. Validation errors (422) come back per field. */
export async function createSupportIssue(input: NewSupportIssue): Promise<CreateIssueResult> {
  const client = await api();
  let result;
  try {
    result = await client.POST("/support-issues", { body: input });
  } catch {
    return { ok: false, message: `The Kontor API isn't reachable at ${BASE_URL}.`, fieldErrors: {} };
  }
  const { data, error, response } = result;
  if (data) return { ok: true, issue: data };
  if (response.status === 401) redirect("/login?error=session_expired");

  const fieldErrors: Record<string, string> = {};
  if (response.status === 422 && error && Array.isArray(error.detail)) {
    for (const problem of error.detail) {
      const field = String(problem.loc[problem.loc.length - 1]); // e.g. "relatedTicketRef"
      fieldErrors[field] ??= problem.msg;
    }
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }
  return { ok: false, message: describe(error, response.status), fieldErrors };
}

// ── Platform portal ─────────────────────────────────────────

/** Every tenant's issues, already in triage order (platform staff only). */
export async function getAllSupportIssues(): Promise<SupportIssue[]> {
  return call((await api()).GET("/platform/support-issues"));
}
