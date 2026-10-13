// Centralized API and Socket.IO configuration with environment variables and local fallbacks
const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/+$/, "");
