import { request } from "./client";

export const syncGmail = (query = "") => request(`/api/gmail/sync${query ? `?q=${encodeURIComponent(query)}` : ""}`, { method: "POST", timeout: 120000 });
export const getMessages = (params = {}) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
  return request(`/api/gmail/messages?${search}`);
};
export const getMessage = (id) => request(`/api/gmail/messages/${id}`);
export const analyzeEmail = (id) => request(`/api/gmail/messages/${id}/analyze`, { method: "POST" });
export const updateRead = (id, isRead) => request(`/api/gmail/messages/${id}/read`, { method: "PATCH", body: JSON.stringify({ isRead }) });
export const updateStar = (id, isStarred) => request(`/api/gmail/messages/${id}/star`, { method: "PATCH", body: JSON.stringify({ isStarred }) });
export const sendMessage = (payload) => request("/api/gmail/send", { method: "POST", body: JSON.stringify(payload) });
export const replyMessage = (id, payload) => request(`/api/gmail/messages/${id}/reply`, { method: "POST", body: JSON.stringify(payload) });
