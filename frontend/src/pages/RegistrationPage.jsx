import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import RegistrationForm from "../components/forms/RegistrationForm";

//If token is valid RegistrationForm will open with seeded data:
export default function RegistrationPage() {
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
        <h1 className="page-title">Registration</h1>
        <p className="page-subtitle">
          Please complete your details and create your login credentials.
        </p>
      </header>
      <RegistrationForm seed={seed} onComplete={onComplete} />
    </div>
  );
}
