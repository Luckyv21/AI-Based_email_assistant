const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function request(path, options = {}) {
  const token = localStorage.getItem("email_assistant_token");
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
    response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The backend request timed out. Please try again.");
    throw new Error(`Cannot reach the backend at ${API_URL}. Start the backend with "cd backend && npm start".`);
  }
  let data = null;
  try { data = await response.json(); } catch { /* Empty responses are valid for disconnect. */ }
  if (response.status === 401) window.dispatchEvent(new Event("auth:expired"));
  if (!response.ok) throw new Error(data?.message || data?.detail || `Request failed (${response.status})`);
  return data;
}

export { API_URL };
