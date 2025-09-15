import React, { useState } from "react";
import AdminTokenForm from "../components/forms/AdminTokenForm";

export default function GenerateToken() {
  const [link, setLink] = useState("");

  const onTokenReady = (token, data) => {
    //Build registration link
    const caseUrl = window.location.origin; //this returns base url-  http://LocalHost:1024
    const registrationLink = `${baseUrl}/register/new?token=${token}`;
    setLink(registrationLink);

    alert(`Token issued: ${token}\n(Link sent to user)`);
  };

  const copyToClipboard = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      alert("Link copied to clipboard.");
    }
  };

  return (
    <div className="page container">
      <header className="page-header">
        <h1 className="page-title">Admin Issue Token</h1>
        <p className="page-subtitle">
          Create and send a one-time registration link to new user.
        </p>
      </header>
      <AdminTokenForm onTokenReady={onTokenReady} />

      {link && (
        <div style={{ marginTop: "1rem" }}>
          <label className="label">Registration Link: </label>
          <input
            className="input"
            type="text"
            value={link}
            readOnly
            style={{ width: "100%", marginButtom: "0.5rem" }}
          />
          <button className="btn btn-primary" onClick={copyToClipboard}>
            Copy Link
          </button>

          {/* TODO: Add WA and email functionality */}
          <button className="btn btn-primary">Send Link</button>
        </div>
      )}
    </div>
  );
}
