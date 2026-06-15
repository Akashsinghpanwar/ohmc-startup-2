import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const client = axios.create({ baseURL: BASE, timeout: 60000 });

// ── JWT token management ───────────────────────────────────────────────────
const TOKEN_KEY = 'ohmc_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Attach token to every request automatically
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Auth ───────────────────────────────────────────────────────────────────
export const signup = (data) =>
  client.post('/api/auth/signup', data).then(r => {
    setToken(r.data.token);
    return r.data;
  });

export const login = (data) =>
  client.post('/api/auth/login', data).then(r => {
    setToken(r.data.token);
    return r.data;
  });

export const getMe = () =>
  client.get('/api/auth/me').then(r => r.data);

export const updateProfile = (data) =>
  client.patch('/api/auth/me', data).then(r => r.data);

export const logout = () => {
  clearToken();
};

// Google OAuth — redirects browser to backend which redirects to Google
export const googleLoginUrl = (role = 'landowner') =>
  `${BASE}/api/auth/google?role=${role}`;

// ── Eligibility ────────────────────────────────────────────────────────────
export const scanBoundary = (geometry, landName = 'My Parcel') =>
  client.post('/api/eligibility/scan', { geometry, land_name: landName }).then(r => r.data);

export const scanHistory = (limit = 20) =>
  client.get('/api/eligibility/history', { params: { limit } }).then(r => r.data);

export const getScan = (scanId) =>
  client.get(`/api/eligibility/scan/${scanId}`).then(r => r.data);

// ── Parcels ────────────────────────────────────────────────────────────────
export const createParcel = (data) =>
  client.post('/api/parcels/', data).then(r => r.data);

export const listParcels = () =>
  client.get('/api/parcels/').then(r => r.data);

// ── Projects ───────────────────────────────────────────────────────────────
export const listProjects = (params = {}) =>
  client.get('/api/projects/', { params }).then(r => r.data);

// ── Marketplace (real registry data: Verra + Gold Standard + local) ────────
export const listMarketplace = (params = {}) =>
  client.get('/api/marketplace/', { params }).then(r => r.data);

export const getProject = (id) =>
  client.get(`/api/projects/${id}`).then(r => r.data);

export const registerInterest = (projectId, data) =>
  client.post(`/api/projects/${projectId}/interest`, data).then(r => r.data);

// ── Carbon ─────────────────────────────────────────────────────────────────
export const estimateCarbon = (data) =>
  client.post('/api/carbon/estimate', data).then(r => r.data);

// ── Health ─────────────────────────────────────────────────────────────────
export const checkHealth = () =>
  client.get('/api/health').then(r => r.data).catch(() => null);
