import { useEffect, useState } from "react";
import { useSystem } from "../useSystem";
import { usePipeClient } from "../../api/socket";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/app-base.css";
import "../../styles/apps/users-app.css";

export default function UsersApp() {
  const { systemState, openWindow, addNotification, closeWindow } = useSystem();
  const client = usePipeClient();
  const role = systemState?.userProfile?.role?.toLowerCase() || "user";

  if (role !== "sysadmin") {
    return (
      <div className="app-container users-container users-forbidden">
        <div className="users-forbidden-card app-card">
          <h2>Sysadmin only</h2>
          <p>You don't have permission to view Users.</p>
          <button className="btn btn-primary btn-sm" onClick={closeWindow}>
            OK
          </button>
        </div>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load users from backend
  useEffect(() => {
    if (!client) return;

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        const cmd = await client.run_command("users list");
        if (cmd.command_result !== 0)
          throw new Error(cmd.error || "Command failed");

        const data = JSON.parse(cmd.output || "[]");
        setUsers(data);
      } catch (err) {
        console.error("Error loading users:", err);
        setError("Unable to load users");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [client]);

  // Filter logic
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.surname?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  // Handler for edit action
  const handleEdit = (user) => {
    addNotification(`Editing user: ${user.name} ${user.surname}`, "info");
    openWindow("settings", {
      title: `Edit: ${user.name}`,
      instanceData: { user },
    });
  };

  return (
    <div className="app-base">
      {/* Header */}
      <header className="users-toolbar">
        <h2 className="users-title">Users</h2>

        <div className="users-toolbar-actions">
          {/* Search bar — same as PilotsApp */}
          <div className="users-search">
            <div className="users-search-field">
              <span className="users-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Enter name, surname, email, or role"
                value={search}
                onChange={(e) => setSearch(e.target.value.trimStart())}
                className="users-search-input"
                autoComplete="off"
              />
            </div>
          </div>

          {/* New User button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              openWindow("invite-user", { title: "Invite New User" })
            }
          >
            + New User
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="app-content">
        <table className="table table--zebra">
          <thead>
            <tr>
              <th>Name</th>
              <th>Surname</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Role</th>
              <th className="table-col-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="table-empty">
                  Loading users...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="6" className="table-empty">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="table-empty">
                  {search
                    ? `No users found matching "${search}"`
                    : "No user data available"}
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => (
                <tr key={i}>
                  <td>{user.name || "-"}</td>
                  <td>{user.surname || "-"}</td>
                  <td>{user.phone || "-"}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.role || "-"}</td>
                  <td className="table-col-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="app-footer">
        <button
          className="btn btn-primary"
          onClick={() => addNotification("Export coming soon!", "info")}
        >
          Generate Report
        </button>
      </footer>
    </div>
  );
}
