import React from "react";
import "../../styles/PilotOnboarding.css";

export const Card = ({ children, className = "" }) => (
  <div className={`card ${className}`}>{children}</div>
);

export const CardHeader = ({ title, subtitle, icon }) => (
  <div className="card-header">
    <div className="card-header-row">
      {icon ? (
        <div className="card-header-icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <div>
        <h2 className="card-title">{title}</h2>
        {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  </div>
);

export const CardBody = ({ children }) => (
  <div className="card-body">{children}</div>
);
