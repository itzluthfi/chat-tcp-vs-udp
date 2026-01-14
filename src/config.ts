const ENV_URL = import.meta.env.VITE_API_URL;

// URL Dasar Server
export const BASE_URL = ENV_URL || "";

// URL untuk API (tambah /api)
export const API_URL = `${BASE_URL}/api`;

// URL untuk Socket.io (biasanya base url saja)
export const SOCKET_URL = BASE_URL;
