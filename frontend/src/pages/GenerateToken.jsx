import React from "react";
import AdminTokenForm from "../components/forms/AdminTokenForm";

export default function GenerateToken() {
  const onTokenReady = (token, data) => {
    alert(`Token issued: ${token}\n(Sent to user)`);
  };

  return (
    <div className="page container">
      <header className="page-header">
        <h1 className="page-title">Admin Issue Token</h1>
        <p className="page-subtitle">
          Create and send a one-time registration token for a new user.
        </p>
      </header>
      <AdminTokenForm onTokenReady={onTokenReady} />
    </div>
  );
}
