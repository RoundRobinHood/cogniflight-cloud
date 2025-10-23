import { useEffect, useState } from "react";
import { usePipeClient, StringIterator } from "../../api/socket";
import YamlCRLF from "../../api/yamlCRLF";
import YAML from "yaml";
import "../../styles/utilities/tables.css";
import "../../styles/apps/app-base.css";
import "../../styles/apps/users-app.css";
import "../../styles/utilities/buttons.css";

export default function UserPermissionsApp({ instanceData }) {
  const user = instanceData?.user || {};
  const username = user.username;
  const profile = user.user_profile || {};
  const client = usePipeClient();
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  const [notification, setNotification] = useState("");
  const [disabled, setDisabled] = useState(user.disabled || false);

  // All known/standard system tags
  const knownTags = ["sysadmin", "atc", "pilot", "edge-node", "user"];

  // Load user tags
  useEffect(() => {
    if (!client || !username) return;

    const fetchTags = async () => {
      try {
        setLoading(true);
        const cmd = await client.run_command(
          `cat "/etc/passwd/${username}.login"`
        );
        if (cmd.command_result === 0 && cmd.output.trim() !== "") {
          console.log(
            "Raw YAML content from backend:",
            JSON.stringify(cmd.output)
          );

          const parsed = YAML.parse(cmd.output);
          // console.log("Parsed user tags:", parsed);
          setTags(parsed?.tags || []);
        } else {
          console.warn("No tags found or empty output:", cmd.output);
          setTags([]);
        }
      } catch (err) {
        console.error("Error fetching tags:", err);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [client, username]);

  // Toggle a tag on/off; Ensure all tags lower-case
  const toggleTag = (tag) => {
    const normalized = tag.toLowerCase();
    setTags((prev) => {
      const exists = prev.includes(normalized);
      const updated = exists
        ? prev.filter((t) => t !== normalized)
        : [...prev, normalized];
      setSaved(false);
      return updated;
    });
  };

  // Add a custom tag (with validation & duplicate handling)
  const handleAddTag = (tagToAdd) => {
    const trimmed = (tagToAdd || newTag).trim().toLowerCase();

    // Basic validation
    if (!trimmed) {
      setNotification("Please enter a tag name.");
      setTimeout(() => setNotification(""), 2000);
      return;
    }
    if (/\s/.test(trimmed)) {
      setNotification("Tags cannot contain spaces.");
      setTimeout(() => setNotification(""), 2000);
      return;
    }

    // Check for duplicates
    if (tags.includes(trimmed)) {
      setNotification(`The tag "${trimmed}" already exists.`);
      setTimeout(() => setNotification(""), 2000);
      setNewTag("");
      return;
    }

    // Add as new custom tag
    setTags((prev) => [...prev, trimmed]);
    setNewTag("");
    setSaved(false);
  };

  // Save updated tags to backend using update_login_file helper
  const handleSave = async () => {
    try {
      setSaved(true);
      setLoading(true);

      const result = await client.update_login_file(username, { tags });

      if (result) {
        setNotification(`Tags updated for ${username}`);
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error("Save error:", err);
      setNotification("Failed to save tags");
      setSaved(false);
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Disable user — delete signup file
  const handleDisable = async () => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    try {
      const result = await client.run_command(
        `rm "/etc/passwd/${username}.signup"`
      );

      if (
        result.command_result === 0 ||
        result.error.includes("file does not exist")
      ) {
        setDisabled(true);
        instanceData.user.disabled = true; // refresh status in parent
        setNotification(`User ${username} has been deactivated.`);
      } else {
        throw new Error(result.error || "Failed to deactivate user");
      }
    } catch (err) {
      console.error("Deactivate error:", err);
      setNotification("Failed to deactivate user.");
    } finally {
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Filter known tags based on what's being typed
  const filteredSuggestions = knownTags.filter((t) => {
    if (!newTag) return false;

    const input = newTag.toLowerCase().replace(/[^a-z0-9]/g, "");
    const tag = t.toLowerCase().replace(/[^a-z0-9]/g, "");

    return tag.includes(input);
  });

  return (
    <div className="app-container permissions-container">
      <h2>Edit User Permissions</h2>
      <p>
        Editing user: <strong>{profile.name || username}</strong>
      </p>

      {notification && (
        <div className="inapp-notification success">{notification}</div>
      )}

      {loading ? (
        <p>Loading permissions...</p>
      ) : (
        <>
          <table className="table table--zebra permissions-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag}>
                  <td>{tag}</td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleTag(tag)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-group add-tag-group">
            <div className="tag-input-wrapper">
              <input
                type="text"
                placeholder="Enter new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="editable-input"
                autoComplete="off"
              />

              {filteredSuggestions.length > 0 && (
                <ul className="tag-suggestions">
                  {filteredSuggestions.map((t) => {
                    const alreadyHas = tags.includes(t);
                    return (
                      <li
                        key={t}
                        onClick={() => {
                          if (!alreadyHas) handleAddTag(t); // directly pass tag to add
                        }}
                        className={alreadyHas ? "tag-disabled" : ""}
                      >
                        {t}{" "}
                        {alreadyHas && (
                          <span className="tag-note">(already added)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleAddTag}>
              + Add Tag
            </button>
          </div>
        </>
      )}

      <div className="app-footer permissions-actions">
        <button
          className={`btn btn-primary ${saved ? "btn-saved" : ""}`}
          onClick={handleSave}
          disabled={saved || loading}
        >
          {saved ? "Saved" : "Save Changes"}
        </button>

        <button
          className={`btn btn-danger disable-user-btn ${
            disabled ? "btn-disabled" : ""
          }`}
          onClick={!disabled ? handleDisable : undefined}
          disabled={disabled}
        >
          {disabled ? "User Deactivated" : "Deactivate User"}
        </button>
      </div>
    </div>
  );
}
