import { useEffect, useState } from "react";
import "../../styles/utilities/tables.css";
import "../../styles/apps/app-base.css";
import "../../styles/apps/users-app.css";

export default function UserPermissionsApp({ instanceData }) {
  const user = instanceData?.user || {};
  const profile = user.user_profile || {};

  const [permissions, setPermissions] = useState(
    user.permissions || {
      dashboard: "read",
      pilots: "read",
      users: "read",
    }
  );

  //implemented to make buttons appear different after saving
  const [saved, setSaved] = useState(true);
  const [notification, setNotification] = useState("");

  //When user or permissions change - reset save state
  useEffect(() => {
    setSaved(false);
  }, [permissions]);

  const handlePermissionChange = (app, level) => {
    setPermissions((prev) => ({
      ...prev,
      [app]: level,
    }));
  };

  const handleSave = () => {
    console.log("Saving updated permissions:", { user, permissions });
    setSaved(true);
    // TODO: send update request to backend
    setNotification(
      `Permissions for ${profile.name || user.username} updated.`
    );
    setTimeout(() => setNotification(""), 3000);
  };

  const handleDisable = () => {
    if (confirm("Disable this user's login?")) {
      console.log("Disabling user:", user);
      setNotification("User has been disabled (login credentials removed).");
      setTimeout(() => setNotification(""), 3000);
    }
  };
  // TODO: call backend endpoint to remove username/password:
  //   const handleDisable = async () => {
  //   if (confirm("Disable this user's login?")) {
  //     try {
  //       await client.disable_user(user.id); // backend call
  //       user.disabled = true; // reflect locally
  //       setNotification("User has been disabled.");
  //       setSaved(true);
  //     } catch (err) {
  //       console.error("Error disabling user:", err);
  //       setNotification("Failed to disable user.");
  //     }
  //   }
  // };

  return (
    <div className="app-container permissions-container">
      <h2>Edit Permissions</h2>
      <p>
        Editing user:{" "}
        <strong>{profile.name || user.username || "Unnamed"}</strong>
      </p>
      {notification && (
        <div className="inapp-notification success">{notification}</div>
      )}
      <table className="table table--zebra permissions-table">
        <thead>
          <tr>
            <th>Application</th>
            <th>Access Level</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(permissions).map(([app, level]) => (
            <tr key={app}>
              <td>{app}</td>
              <td>
                <select
                  value={level}
                  onChange={(e) => handlePermissionChange(app, e.target.value)}
                >
                  <option value="read">Read</option>
                  <option value="write">Write</option>
                  <option value="manage">Manage</option>
                  {/* change to whatever we choose */}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="app-footer permissions-actions">
        <button
          className={`btn btn-primary ${saved ? "btn-saved" : ""}`}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? "Saved" : "Save Changes"}
        </button>

        <button
          className={`btn btn-danger disable-user-btn ${
            user.disabled ? "btn-disabled" : ""
          }`}
          onClick={!user.disabled ? handleDisable : undefined}
          disabled={user.disabled}
        >
          {user.disabled ? "User Disabled" : "Disable User"}
        </button>
      </div>
    </div>
  );
}
