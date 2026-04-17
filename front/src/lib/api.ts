const BASE_URL = 'http://localhost:3001';

async function doFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export async function apiFetch<T = void>(path: string, options?: RequestInit): Promise<T> {
  let res = await doFetch(path, options);

  if (res.status === 401) {
    const refreshRes = await doFetch('/auth/refresh', { method: 'POST' });
    if (!refreshRes.ok) {
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    res = await doFetch(path, options);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
