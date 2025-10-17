
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, ShieldAlert, Pencil } from "lucide-react";
import { useSystem } from "../useSystem";
import { usePipeClient } from "../../api/socket";
import { listUsers, searchUsers } from "../../api/users";
import "../../styles/apps/users-app.css"; // toolbar/search/pager/forbidden view

function Forbidden() {
  return (
    <div className="app-container users-container users-forbidden">
      <div className="users-forbidden-card app-card">
        <ShieldAlert className="users-forbidden-icon" />
        <h2>Admins only</h2>
        <p>You don’t have permission to view Users.</p>
        <button className="btn btn-primary btn-sm">OK</button>
      </div>
    </div>
  );
}

export default function UsersApp() {
  const { systemState, openWindow, addNotification } = useSystem();
  const role = systemState?.currentUser?.role || "user";
  if (role !== "admin") return <Forbidden />;

  // state
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // derived
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  // initial fetch
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listUsers();
        if (!cancel) setRows(data);
      } catch {
        if (!cancel) setErr("Failed to load users");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // search
  const doSearch = async (e) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      const data = q.trim() ? await searchUsers(q.trim()) : await listUsers();
      setRows(data);
      setPage(1);
      setErr("");
    } catch {
      setErr("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // actions
  const onEdit = (user) => {
    openWindow("settings", { title: `Edit: ${user.name || user.email}`, instanceData: { user } });
  };

  const onInvite = () => {
    addNotification("Invite flow coming next…", "info");
    openWindow("notepad", { title: "New User (Invite Draft)" });
  };

  // render
  return (
    <div className="app-container users-container">
      <header className="app-header users-header">
        <h1 className="app-title">Users</h1>
        <p className="app-subtitle">Manage roles, contact details and account status</p>
      </header>

      <div className="app-toolbar users-toolbar">
        <form className="users-search" onSubmit={doSearch}>
          <div className="users-search-field">
            <Search className="users-search-icon" />
            <input
              className="app-form-input users-search-input"
              type="text"
              placeholder="Search by name, email, or role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary btn-sm" type="submit">Search</button>
        </form>

        <button className="btn btn-primary btn-sm users-invite" onClick={onInvite}>
          <UserPlus size={16} />
          <span>New User</span>
        </button>
      </div>

      <main className="app-content">
        {loading && <div className="users-state">Loading users…</div>}
        {!!err && !loading && <div className="users-error">{err}</div>}

        {!loading && !err && (
          <div className="app-card users-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="table-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && (
                  <tr>
                    <td colSpan="5" className="table-empty">No users found</td>
                  </tr>
                )}
                {paged.map((u) => {
                  const key = (u.role || "neutral").toLowerCase() === "ground" ? "atc" : (u.role || "neutral");
                  return (
                    <tr key={u.id}>
                      <td>{u.name || "—"}</td>
                      <td>{u.email}</td>
                      <td><span className={`pill pill--${key}`}>{(key || "user").toUpperCase()}</span></td>
                      <td>
                        <span className={`status-dot ${u.active ? "status-dot--ok" : "status-dot--off"}`} />
                        {u.active ? "Active" : "Disabled"}
                      </td>
                      <td className="table-col-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(u)}>
                          <Pencil size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rows.length > pageSize && (
              <div className="users-pager">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="users-page-indicator">
                  Page {page} of {Math.ceil(rows.length / pageSize)}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page === Math.ceil(rows.length / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
