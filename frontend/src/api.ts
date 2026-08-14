// API configuration helper
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedPath = cleanPath.startsWith('/ms/cyberx') ? cleanPath : `/ms/cyberx${cleanPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default API_BASE_URL;
