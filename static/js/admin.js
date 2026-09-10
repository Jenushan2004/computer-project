function openEditModal(id, username, isAdmin) {
  document.getElementById("editUserId").value = id;
  document.getElementById("editUsername").value = username;
  document.getElementById("editPassword").value = "";
  document.getElementById("editIsAdmin").checked = isAdmin;
  document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
}

async function saveUser() {
  const id = document.getElementById("editUserId").value;
  const payload = {
    username: document.getElementById("editUsername").value.trim(),
    is_admin: document.getElementById("editIsAdmin").checked
  };
  const pw = document.getElementById("editPassword").value;
  if (pw) payload.password = pw;

  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Update failed");
    return;
  }

  closeEditModal();
  await refreshUsers();
}

async function deleteUser(id, username) {
  if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;

  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Delete failed");
    return;
  }

  if (res.ok) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) row.remove();
  }
}

async function refreshUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return;

  const data = await res.json();
  const tbody = document.getElementById("usersTable");
  tbody.innerHTML = "";

  data.users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.dataset.id = user.id;
    tr.innerHTML = `
      <td><span class="user-cell">👤 ${user.username}</span></td>
      <td>${user.is_admin ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>'}</td>
      <td>${user.created_at || "—"}</td>
      <td>${user.last_logged_in || "Never"}</td>
      <td>${user.password_changed_at || "—"}</td>
      <td>${
        user.is_expired
          ? '<span class="tag tag-expired">Expired</span>'
          : user.reminder_due
            ? `<span class="tag tag-due-soon">Due in ${user.days_until_expiry}d</span>`
            : `<span class="tag tag-ok">OK (${user.days_until_expiry}d left)</span>`
      }</td>
      <td class="actions-cell">
        <button type="button" class="btn btn-ghost btn-sm" onclick="openEditModal('${user.id}', '${user.username}', ${user.is_admin})">Edit</button>
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}', '${user.username}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("editModal").addEventListener("click", (e) => {
  if (e.target.id === "editModal") closeEditModal();
});
