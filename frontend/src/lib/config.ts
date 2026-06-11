// Backend API origin. Override with VITE_API_URL at build time for other
// environments; defaults to the production API.
export const API_ORIGIN = (import.meta.env.VITE_API_URL as string) || "https://api.shulecloud.com";
