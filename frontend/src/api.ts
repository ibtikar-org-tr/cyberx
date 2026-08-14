// API configuration helper
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function getApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export default API_BASE_URL;
