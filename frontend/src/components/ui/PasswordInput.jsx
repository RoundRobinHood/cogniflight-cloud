import React, { useState } from "react";
import { Input } from "./Input";
import { GhostButton } from "./Button";

export default function PasswordInput({
  value,
  onChange,
  id,
  placeholder = "Create a strong password",
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <GhostButton
        type="button"
        className="password-toggle"
        onClick={() => setShow((s) => !s)}
      >
        {show ? "Hide" : "Show"}
      </GhostButton>
    </div>
  );
}
