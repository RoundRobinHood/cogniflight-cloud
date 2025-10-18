import { useState } from "react";
import { useSystem } from "../useSystem";
import "../../styles/apps/app-base.css";
import "../../styles/utilities/modal.css";

function normalizeInstanceData(instanceData) {
  if (!instanceData) return "Invite New User";

  // If it's an object with title property
  if (typeof instanceData === "object" && "title" in instanceData)
    return instanceData.title;

  // If it's a string
  if (typeof instanceData === "string") return instanceData;

  return "Invite New User";
}

export default function InviteUserApp({ instanceData }) {
  const { addNotification } = useSystem();

  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation: one of email or phone must be provided
    if (!email && !phone) {
      addNotification("Please enter at least one contact detail", "error");
      return;
    }

    // Simulate generated token and link (this can later come from backend)
    const token = Math.random().toString(36).substring(2, 10);
    const link = `https://cogniflight.cloud/register?token=${token}`;

    // Show confirmation popup
    setInviteLink(link);
    setShowPopup(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      addNotification("Link copied to clipboard!", "info");
    } catch {
      addNotification("Failed to copy link", "error");
    }
  };

  const safeTitle = normalizeInstanceData(instanceData);

  return (
    <div className="app-base">
      <header className="app-header">
        <h2 className="app-title">{safeTitle}</h2>
      </header>

      <div className="app-content">
        <form className="app-form" onSubmit={handleSubmit}>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Select a role</option>
            <option value="sysadmin">Admin</option>
            <option value="atc">Air Traffic Controller</option>
            <option value="pilot">Pilot</option>
            <option value="data-analyst">Data Analyst</option>
          </select>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
          />

          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
          />

          <button className="btn btn-primary">Send Invitation</button>
        </form>
      </div>

      {/* === Confirmation Popup === */}
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
