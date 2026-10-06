import { request } from "./client";

export const EVENTS_AVAILABLE = true;

export async function getEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return request(`/api/events${qs}`);
}

export async function getEvent(id) {
  return request(`/api/events/${id}`);
}

export async function createEvent(payload) {
  return request("/api/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateEvent(id, payload) {
  return request(`/api/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteEvent(id) {
  return request(`/api/events/${id}`, {
    method: "DELETE"
  });
}
