import { useState } from "react";
import { useSystem } from "../useSystem";
import { usePipeClient } from "../../api/socket"; // ✅ import the backend client
import "../../styles/apps/app-base.css";
import "../../styles/utilities/modal.css";

export default function InviteUserApp({ instanceData }) {
  const { addNotification } = useSystem();
  const client = usePipeClient();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email && !phone) {
      addNotification("Please enter at least one contact detail", "error");
      return;
    }
    if (!role) {
      addNotification("Please select a role", "error");
      return;
    }

    if (!client) {
      addNotification("Backend not connected yet", "error");
      return;
    }

    setLoading(true);
    try {
      const contactInfo = email ? { email } : { phone };
      const token = await client.create_invite(role, contactInfo);

      const link = `https://cogniflight.cloud/register?token=${token}`;
      setInviteLink(link);
      setShowPopup(true);
      addNotification("Invitation created successfully!", "success");
    } catch (err) {
      console.error("Failed to create invite:", err);
      addNotification("Failed to create invitation", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      addNotification("Link copied to clipboard!", "info");
    } catch {
      addNotification("Failed to copy link", "error");
    }
  };

  return (
    <div className="app-base">
      <header className="app-header">
        <h2 className="app-title">Invite New User</h2>
      </header>

      <div className="app-content">
        <form className="app-form" onSubmit={handleSubmit}>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">Select a role</option>
            <option value="sysadmin">Admin</option>
            <option value="atc">Air Traffic Controller</option>
            <option value="pilot">Pilot</option>
            <option value="edge-node">Edge Node</option>
          </select>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            disabled={loading}
          />

          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            disabled={loading}
          />

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </div>

      {showPopup && (
        <div className="modal-overlay">
          <div className="modal-card">
            <header className="modal-header">
              <h3>Invitation Sent!</h3>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowPopup(false)}
              >
                ✕
              </button>
            </header>

            <div className="modal-body">
              <p>
                Invitation sent to:
                <br />
                {email && <strong>{email}</strong>}
                {email && phone && <br />}
                {phone && <strong>{phone}</strong>}
              </p>

              <p>
                Registration link:
                <br />
                <code>{inviteLink}</code>
              </p>

              <button
                className="btn btn-secondary"
                style={{ marginTop: "1rem" }}
                onClick={handleCopy}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
