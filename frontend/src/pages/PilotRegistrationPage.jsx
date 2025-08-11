import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PilotRegistrationForm from "../components/forms/PilotRegistrationForm";
import { useTokenStore } from "../services/tokenStore";

//If token is valid PilotRegistrationForm will open with seeded data:
export default function PilotRegistrationPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token"), [params]);
  const tokenStore = useTokenStore();
  const [seed, setSeed] = useState(null);

  useEffect(() => {
    if (token) {
      const s = tokenStore.get(token);
      setSeed(s || null);
    }
  }, [token]);

  const onComplete = (profile) => {
    //Call backend to create the user and invalidate the token
    alert("Registration complete! (Mock)");
  };

  if (!token) return <div className="page container">Missing token.</div>;
  if (!seed)
    return <div className="page container">Invalid or expired token.</div>;

  return (
    <div className="page container">
      <header className="page-header">
        <h1 className="page-title">Pilot Registration</h1>
        <p className="page-subtitle">
          Please complete your details and create your login credentials.
        </p>
      </header>
      <PilotRegistrationForm seed={seed} onComplete={onComplete} />
    </div>
  );
}
