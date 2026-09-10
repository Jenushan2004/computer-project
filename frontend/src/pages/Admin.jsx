import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await api.listUsers();
    setUsers(data.users);
  };

  useEffect(() => {
    if (user?.is_admin) load().catch(() => setError("Failed to load users"));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;

  const save = async () => {
    const payload = { username: edit.username, is_admin: edit.is_admin };
    if (edit.password) payload.password = edit.password;
    try {
      await api.updateUser(edit.id, payload);
      setEdit(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id, name) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await api.deleteUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const expired = users.filter((u) => u.is_expired).length;
  const admins = users.filter((u) => u.is_admin).length;

  return (
    <div className="page admin-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title">User management</h1>
          <p className="page-sub">Monitor rotation compliance and manage roles across the platform.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-stats">
        <div className="stat">
          <span className="stat-label">Total users</span>
          <strong>{users.length}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Administrators</span>
          <strong>{admins}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Expired passwords</span>
          <strong className={expired ? "text-danger" : ""}>{expired}</strong>
        </div>
      </div>

      <div className="panel table-panel">
        <header className="panel-head">
          <div>
            <p className="panel-kicker">Directory</p>
            <h2>All users</h2>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Last change</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="table-user">
                      <span className="avatar sm">{u.username.slice(0, 1).toUpperCase()}</span>
                      {u.username}
                    </div>
                  </td>
                  <td>{u.is_admin ? "Admin" : "User"}</td>
                  <td className="mono">{u.password_changed_at || "—"}</td>
                  <td>
                    {u.is_expired ? (
                      <span className="tag bad">Expired</span>
                    ) : u.reminder_due ? (
                      <span className="tag warn">Due in {u.days_until_expiry}d</span>
                    ) : (
                      <span className="tag ok">Compliant</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit({ ...u, password: "" })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(u.id, u.username)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="modal-backdrop" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {edit.username}</h3>
            <label className="field">
              Username
              <input value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} />
            </label>
            <label className="field">
              New password (optional)
              <input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            </label>
            <label className="chip">
              <input type="checkbox" checked={edit.is_admin} onChange={(e) => setEdit({ ...edit, is_admin: e.target.checked })} />
              Administrator
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
