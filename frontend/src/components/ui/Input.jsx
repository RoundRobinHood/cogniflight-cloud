import React from "react";
import "../../styles/forms.css";

export const Input = ({ className = "", ...props }) => (
  <input className={`input ${className}`} {...props} />
);

export const Field = ({ label, htmlFor, children, required, hint, error }) => (
  <div className="field">
    <label htmlFor={htmlFor} className="label">
      {label} {required ? <span className="req">*</span> : null}
    </label>
    {children}
    {hint && !error ? <p className="hint">{hint}</p> : null}
    {error ? <p className="error">{error}</p> : null}
  </div>
);

export const Divider = () => <div className="divider" />;
