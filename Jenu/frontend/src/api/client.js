const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  me: () => request("/api/me"),
  login: (username, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username, password) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  changePassword: (payload) =>
    request("/api/account/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  chat: (message, state) =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, state }),
    }),
  chatStatus: () => request("/api/chat/status"),
  listUsers: () => request("/api/users"),
  updateUser: (id, payload) =>
    request(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
};
