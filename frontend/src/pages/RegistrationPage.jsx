import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import RegistrationForm from "../components/forms/RegistrationForm";
import { Signup } from "../api/auth";

//If token is valid RegistrationForm will open with seeded data:
export default function RegistrationPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token"), [params]);
  const navigate = useNavigate();

  const onComplete = async (profile) => {
    try {
      const result = await Signup({ ...profile, tokStr: token });
      if (result.authorized) {
        alert("Registration complete! You may now proceed to logging in.");
        navigate("/login");
      } else {
        alert(`Registration failed: ${result.message ?? result.reason}`);
      }
    } catch (err) {
      console.error("Signup failed: ", err);
      alert("Unexpected error during signup. Please try again later.");
    }
  };

  if (!token) return <div className="page container">Missing token.</div>;

  return (
    <div className="page container">
      <header className="page-header">
        <h1 className="page-title">Registration</h1>
        <p className="page-subtitle">
          Please complete your details and create your login credentials.
        </p>
      </header>
      <RegistrationForm onComplete={onComplete} />
    </div>
  );
}
