import React from "react";
import AdminTokenForm from "../components/forms/AdminTokenForm";
import { useTokenStore } from "../services/tokenStore";

export default function GenerateToken() {
  const tokenStore = useTokenStore();

  const onTokenReady = (token, data) => {
    tokenStore.set(token, data);
    alert(`Token issued: ${token}\n(This will be emailed in production.)`);
  };

  return (
    <div className="page container">
      <header className="page-header">
        <h1 className="page-title">Admin Issue Token</h1>
        <p className="page-subtitle">
          Create and email a one-time registration token for a new pilot.
        </p>
      </header>
      <AdminTokenForm onTokenReady={onTokenReady} />
    </div>
  );
}
