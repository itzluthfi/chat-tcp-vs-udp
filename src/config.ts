const ENV_URL = import.meta.env.VITE_API_URL;


export const BASE_URL = ENV_URL || "";


export const API_URL = `${BASE_URL}/api`;


export const SOCKET_URL = BASE_URL;
