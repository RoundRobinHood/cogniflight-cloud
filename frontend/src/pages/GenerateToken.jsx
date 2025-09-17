import React, { useState } from "react";
import AdminTokenForm from "../components/forms/AdminTokenForm";
import { Card, CardHeader, CardBody } from "../components/ui/Card";

export default function GenerateToken() {
  const [link, setLink] = useState("");

  const onTokenReady = (token, data) => {
    //Build registration link
    const baseUrl = window.location.origin; //this returns base url-  http://LocalHost:1024
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
        <h1 className="page-title">Invite New User</h1>
        <p className="page-subtitle">
          Create and send a one-time registration link to new user.</p>
      </header>
      <AdminTokenForm onTokenReady={onTokenReady} />

      {link && (
        <Card className="margin-top">
          <CardHeader
            title="Registration Link"
            subtitle="This link can be copied or sent directly to user."
          />
          <CardBody>
            <label className="label">Registration Link: </label>
            <input
              className="input margin-bottom"
              type="text"
              value={link}
              readOnly
            />
            <div
              className="row gap margin-top-small"
              style={{ marginTop: "0.5rem" }}
            >
              <button className="btn btn-primary" onClick={copyToClipboard}>
                Copy Link
              </button>

              {/* TODO: Add WA and email functionality */}
              <button className="btn btn-primary">Send Link</button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
