import axios from 'axios';

export const TOKEN_KEY = 'scholaris_token';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turn any failure into a friendly, consistent error object: { message, status, fieldErrors }.
export function normalizeError(err) {
  if (err && err.friendly) return err;
  const res = err && err.response;
  const data = res && res.data;
  const fieldErrors = {};
  if (data && Array.isArray(data.errors)) data.errors.forEach((e) => { if (e.field && !fieldErrors[e.field]) fieldErrors[e.field] = e.message; });
  let message = 'Something went wrong. Please try again.';
  if (!res) message = err && err.code === 'ECONNABORTED' ? 'The request took too long. Please try again.' : 'Cannot reach the server. Check your connection and try again.';
  else if (data && typeof data.message === 'string') message = data.message;
  else if (res.status === 403) message = 'You do not have permission to do that.';
  else if (res.status >= 500) message = 'The server ran into a problem. Please try again shortly.';
  return { friendly: true, message, status: res ? res.status : 0, fieldErrors };
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const e = normalizeError(err);
    const isLogin = err.config && String(err.config.url).includes('/auth/login');
    if (e.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: e.message }));
    }
    return Promise.reject(e);
  }
);

// Unwraps { success, message, data } and returns data.
export const unwrap = (p) => p.then((r) => r.data.data);

export default client;
