const TOKEN_KEY = 'lm_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.status = status;
    this.details = details; // field-level errors from the backend
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(path, { method = 'GET', body, params } = {}) {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)) : '';
  let res;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) onUnauthorized();
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status, data.details);
  return data;
}

export const api = {
  signup: (b) => request('/auth/signup', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  me: () => request('/auth/me'),
  meta: () => request('/leads/meta'),
  stats: () => request('/leads/stats'),
  list: (params) => request('/leads', { params }),
  create: (b) => request('/leads', { method: 'POST', body: b }),
  update: (id, b) => request(`/leads/${id}`, { method: 'PUT', body: b }),
  remove: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
};
