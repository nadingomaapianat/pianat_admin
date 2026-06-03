/**
 * Minimal API client for the standalone admin app.
 *
 * Same public surface the customer app's apiClient exposed (get/post/put/
 * delete/getBaseUrl + error.payload passthrough) so the ported
 * pianatAdminServices works unchanged. Auth is a Bearer token from
 * localStorage (set at login); the NestJS JwtAuthGuard reads it.
 */
const TOKEN_KEY = 'pa_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type JsonInit = Omit<RequestInit, 'method' | 'body'>;

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5040';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private headers(isForm: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    if (!isForm) h['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async request<T = any>(method: string, path: string, body?: unknown, init: JsonInit = {}): Promise<T> {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method,
      headers: { ...this.headers(isForm), ...(init.headers as Record<string, string>) },
      body: body == null ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });

    // 401 → token invalid/expired: bounce to login.
    if (res.status === 401) {
      clearToken();
      if (!location.pathname.startsWith('/login')) location.href = '/login?reason=expired';
    }

    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON / empty */
    }

    if (!res.ok || (payload && payload.success === false)) {
      const message = payload?.message || `Request failed: ${path}`;
      const err = new Error(message) as Error & { payload?: any; status?: number };
      err.payload = payload;
      err.status = res.status;
      throw err;
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data as T;
    }
    return payload as T;
  }

  get<T = any>(path: string, init?: JsonInit): Promise<T> {
    return this.request<T>('GET', path, undefined, init);
  }
  post<T = any>(path: string, body?: unknown, init?: JsonInit): Promise<T> {
    return this.request<T>('POST', path, body, init);
  }
  put<T = any>(path: string, body?: unknown, init?: JsonInit): Promise<T> {
    return this.request<T>('PUT', path, body, init);
  }
  delete<T = any>(path: string, init?: JsonInit): Promise<T> {
    return this.request<T>('DELETE', path, undefined, init);
  }
}

export const api = new ApiClient();
export default api;
