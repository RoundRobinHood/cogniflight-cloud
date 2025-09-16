import React from "react";
import "../../styles/forms.css";

export const Button = ({ children, className = "", ...props }) => (
  <button className={`btn btn-primary ${className}`} {...props}>
    {children}
  </button>
);

// for show-hide password OR start another pilot (low emphasis style)
export const GhostButton = ({ children, className = "", ...props }) => (
  <button className={`btn btn-ghost ${className}`} {...props}>
    {children}
  </button>
);
