import { useState, useRef } from "react";
import "../../styles/apps/app-base.css";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/utilities/modal.css";

export default function PilotsDetails({ pilot, onClose }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  const onDrag = (e) => {
    if (dragging.current) {
      setPos({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    }
  };

  const endDrag = () => (dragging.current = false);

  if (!pilot) return null;

  return (
    <div className="modal-overlay" onMouseMove={onDrag} onMouseUp={endDrag}>
      <div
        className="modal-card"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <header
          className="modal-header"
          onMouseDown={startDrag}
          onMouseUp={endDrag}
        >
          <h2>
            {pilot.name} {pilot.surname}
          </h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            ✕ Close
          </button>
        </header>

        <div className="modal-body">
          <section className="details-section">
            <h3>Basic Info</h3>
            <p>
              <strong>Email:</strong> {pilot.email}
            </p>
            <p>
              <strong>Phone:</strong> {pilot.phone}
            </p>
            <p>
              <strong>License No:</strong> {pilot.license_number}
            </p>
            <p>
              <strong>License Expiry:</strong> {pilot.license_expiry_date}
            </p>
            <p>
              <strong>Flight Hours:</strong> {pilot.total_flight_hours}
            </p>
          </section>

          <section className="details-section">
            <h3>Cabin Preferences</h3>
            <p>
              <strong>Preferred Temp:</strong>{" "}
              {pilot.cabin_preferences?.preferred_temperature_celsius}°C
            </p>
            <p>
              <strong>Tolerance Range:</strong> ±
              {pilot.cabin_preferences?.temperature_tolerance_range_celsius}°C
            </p>
          </section>

          <section className="details-section">
            <h3>Cardiovascular Baselines</h3>
            <p>
              <strong>Resting HR:</strong>{" "}
              {pilot.cardiovascular_baselines?.resting_heart_rate_bpm} bpm
            </p>
            <p>
              <strong>Max HR:</strong>{" "}
              {pilot.cardiovascular_baselines?.max_heart_rate_bpm} bpm
            </p>
            <p>
              <strong>HR Std Dev:</strong>{" "}
              {pilot.cardiovascular_baselines?.resting_heart_rate_std_dev}
            </p>
          </section>

          <section className="details-section">
            <h3>Ocular Baselines</h3>
            <p>
              <strong>Blink Rate:</strong>{" "}
              {pilot.ocular_baselines?.baseline_blink_rate_per_minute}/min
            </p>
            <p>
              <strong>Blink Duration:</strong>{" "}
              {pilot.ocular_baselines?.baseline_blink_duration_ms} ms
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
