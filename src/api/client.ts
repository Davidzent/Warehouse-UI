import type { ProblemDetail } from './types'

/**
 * The single place that talks to the network.
 *
 * Everything goes through here so that three concerns live in one file instead
 * of being repeated at every call site:
 *   1. attaching the bearer token
 *   2. turning the API's RFC 7807 ProblemDetail bodies into a usable Error
 *   3. deciding what "failure" means (any non-2xx)
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly title?: string
  readonly detail?: string
  readonly fieldErrors: Record<string, string> | null

  constructor(problem: ProblemDetail & { status: number }) {
    super(problem.detail ?? problem.title ?? `Request failed with ${problem.status}`)
    this.name = 'ApiError'
    this.status = problem.status
    this.title = problem.title
    this.detail = problem.detail
    this.fieldErrors = problem.fieldErrors ?? null
  }
}

/** Narrowing helper — `catch` gives `unknown` under strict mode. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

/** Set by the auth module on sign-in, cleared on sign-out and on any 401. */
export function setAuthToken(token: string | null) {
  authToken = token
}

/**
 * The auth module registers here so that a 401 from any endpoint ends the
 * session in one place, rather than every call site remembering to check.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
}

export async function request<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 204 and empty bodies are valid responses; don't assume JSON.
  const text = await response.text()
  const payload = text ? safeParse(text) : null

  if (!response.ok) {
    // 401 comes back with an empty body, so there is nothing to show the user —
    // the handler replaces it with a message and a way back in.
    if (response.status === 401) unauthorizedHandler?.()
    throw new ApiError({ ...payload, status: response.status })
  }
  return payload as T
}

function safeParse(text: string): ProblemDetail {
  try {
    return JSON.parse(text) as ProblemDetail
  } catch {
    // A non-JSON body means something upstream failed (proxy, gateway).
    return { detail: text }
  }
}
