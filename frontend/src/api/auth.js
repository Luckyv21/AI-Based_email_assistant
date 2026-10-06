import { API_URL, request } from "./client";

export const login = (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const register = (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const getMe = () => request("/api/auth/me");
export const disconnectGoogle = () => request("/api/auth/google", { method: "DELETE" });
export const googleUrl = () => `${API_URL}/api/auth/google?token=${encodeURIComponent(localStorage.getItem("email_assistant_token") || "")}`;
export const googleSignInUrl = () => `${API_URL}/api/auth/google/signin`;

