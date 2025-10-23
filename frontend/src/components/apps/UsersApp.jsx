import { useEffect, useState } from "react";
import { useSystem } from "../useSystem";
import { usePipeClient } from "../../api/socket";
import YAML from "yaml";
import YamlCRLF from "../../api/yamlCRLF";
import { StringIterator } from "../../api/socket";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/app-base.css";
import "../../styles/apps/users-app.css";
import "../../styles/utilities/buttons.css";

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
  const [savedUsers, setSavedUsers] = useState({}); // per-user save tracking

  // Load users from backend
  const loadUsers = async () => {
    if (!client) return;
    try {
      setLoading(true);
      setError(null);
      const raw = await client.get_users(true);

      let data;
      try {
        data = typeof raw === "string" ? YAML.parse(raw) : raw;
      } catch (yamlErr) {
        console.warn("Failed YAML parse:", yamlErr);
        data = raw;
      }

      // Deep-clone each user so profiles aren’t shared between rows
      const cloned = Array.isArray(data)
        ? data.map((u, i) => ({
            ...structuredClone(u),
            localId: u.id || `user-${i}-${Math.random().toString(36).slice(2)}`,
          }))
        : [];

      setUsers(cloned);
      // Mark all users as initially saved
      const initialSavedState = {};
      cloned.forEach((u) => {
        const key = u.id || u.localId;
        initialSavedState[key] = true; // grey/disabled
      });
      setSavedUsers(initialSavedState);
    } catch (err) {
      console.error("Error loading users:", err);
      setError("Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  // Reload users when client connects
  useEffect(() => {
    loadUsers();

    // Listen for user updates from permissions app
    if (client?.on) {
      client.on("user-updated", loadUsers);
    }

    return () => {
      if (client?.off) client.off("user-updated", loadUsers);
    };
  }, [client]);

  // Search filter
  const filtered = users.filter((u) => {
    const profile = u.user_profile || {};
    const q = search.toLowerCase();
    return (
      profile.name?.toLowerCase().includes(q) ||
      profile.surname?.toLowerCase().includes(q) ||
      profile.phone?.toString().includes(q) ||
      profile.email?.toLowerCase().includes(q) ||
      profile.role?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  // Inline editing (clone the updated user only)
  const handleInlineEdit = (userId, field, value) => {
    setUsers((prev) =>
      prev.map((u) => {
        const key = u.id || u.localId;
        if (key === userId) {
          const updatedProfile = { ...(u.user_profile || {}), [field]: value };
          return { ...u, user_profile: updatedProfile, unsaved: true };
        }
        return u;
      })
    );

    // Reactivate Save only for that specific user
    const key = userId;
    setSavedUsers((prev) => ({ ...prev, [key]: false }));
  };

  // Save specific user
  const handleSave = async (user) => {
    const key = user.id || user.localId;
    const username = user.username;
    const profile = user.user_profile;

    try {
      setSavedUsers((prev) => ({ ...prev, [key]: true }));
      setLoading(true);

      // Convert profile to YAML (with Windows-style CRLF newlines)
      const yaml = YamlCRLF(profile);

      // Write updated profile to the user's home directory
      const result = await client.run_command(
        `tee "/home/${username}/user.profile"`,
        StringIterator(yaml)
      );

      if (result.command_result === 0) {
        addNotification(
          `Changes saved for ${profile?.name || username}`,
          "success"
        );
        // await loadUsers(); // re-fetches updated user list from backend
      } else {
        throw new Error(result.error || "Failed to save profile");
      }
    } catch (err) {
      console.error("Save error:", err);
      setSavedUsers((prev) => ({ ...prev, [key]: false }));
      addNotification(`Failed to save ${user.username}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Edit permissions window
  const handleEditPermissions = (user) => {
    const name = user.user_profile?.name || user.username || "User";
    addNotification(`Editing permissions for: ${name}`, "info");
    openWindow("user-permissions", "Edit Permissions", {
      user,
      onUpdate: loadUsers, // reload UsersApp when permissions change
    });
  };

  return (
    <div className="app-base">
      {/* Header */}
      <header className="users-toolbar">
        <h2 className="users-title">Users</h2>

        <div className="users-toolbar-actions">
          <div className="users-search">
            <div className="users-search-field">
              <span className="users-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, surname, email, or role"
                value={search}
                onChange={(e) => setSearch(e.target.value.trimStart())}
                className="users-search-input"
                autoComplete="off"
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => openWindow("invite-user", "Invite New User")}
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
              <th>Username</th>
              <th>Name</th>
              <th>Surname</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="table-col-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  Loading users...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  {search
                    ? `No users found matching "${search}"`
                    : "No user data available"}
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => {
                const profile = user.user_profile || {};
                const userKey = user.id || user.localId;
                const isSaved = savedUsers[userKey];

                const isDeactivated =
                  user.disabled === true ||
                  // !user.tags ||
                  // user.tags?.length === 0;
                  (Array.isArray(user.tags) && user.tags.length === 0);
                const statusText = isDeactivated ? "Deactivated" : "Active";
                if (isDeactivated) {
                  console.log(
                    `${user.username} is deactivated (tags:`,
                    user.tags,
                    ")"
                  );
                }

                return (
                  <tr key={user.id || user.localId || `user-${i}`}>
                    <td>{user.username}</td>
                    <td>
                      <input
                        type="text"
                        className="editable-input"
                        value={profile.name || ""}
                        onChange={(e) =>
                          handleInlineEdit(
                            user.id || user.localId,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder="Name"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="editable-input"
                        value={profile.surname || ""}
                        onChange={(e) =>
                          handleInlineEdit(
                            user.id || user.localId,
                            "surname",
                            e.target.value
                          )
                        }
                        placeholder="Surname"
                      />
                    </td>
                    <td>
                      <input
                        type="tel"
                        className="editable-input"
                        value={profile.phone || ""}
                        onChange={(e) =>
                          handleInlineEdit(
                            user.id || user.localId,
                            "phone",
                            e.target.value
                          )
                        }
                        placeholder="Phone"
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        className="editable-input"
                        value={profile.email || ""}
                        onChange={(e) =>
                          handleInlineEdit(
                            user.id || user.localId,
                            "email",
                            e.target.value
                          )
                        }
                        placeholder="Email"
                      />
                    </td>
                    <td>
                      <select
                        className="editable-select"
                        value={profile.role || ""}
                        onChange={(e) =>
                          handleInlineEdit(
                            user.id || user.localId,
                            "role",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select role</option>
                        <option value="sysadmin">Admin</option>
                        <option value="atc">Air Traffic Controller</option>
                        <option value="data-analyst">Data Analyst</option>
                        <option value="edge-node">Edge Node</option>
                        <option value="pilot">Pilot</option>
                      </select>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          isDeactivated ? "status-disabled" : "status-active"
                        }`}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="table-col-actions">
                      <div className="action-buttons">
                        <button
                          className={`btn btn-sm save-btn ${
                            isSaved ? "btn-saved" : "btn-primary"
                          }`}
                          onClick={() => handleSave(user)}
                          disabled={isSaved}
                        >
                          {isSaved ? "Saved" : "Save"}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEditPermissions(user)}
                        >
                          Perm
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="app-footer">
        {/* <button
          className="btn btn-primary"
          onClick={() =>
            addNotification("User report generation coming soon!", "info")
          }
        >
          Generate Report
        </button> */}
      </footer>
    </div>
  );
}
