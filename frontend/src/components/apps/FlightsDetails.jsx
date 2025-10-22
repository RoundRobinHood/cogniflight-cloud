import { useState, useRef } from "react";
import "../../styles/utilities/modal.css";
import "../../styles/apps/app-base.css";
import "../../styles/utilities/tables.css";

export default function FlightsDetails({ flight, onClose }) {
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

  if (!flight) return null;

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
          <h2>{flight.flight_number || "Flight Details"}</h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            ✕ Close
          </button>
        </header>

        <div className="modal-body">
          <section className="details-section">
            <h3>Flight Info</h3>
            <p>
              <strong>Flight Number:</strong> {flight.flight_number}
            </p>
            <p>
              <strong>Origin:</strong> {flight.origin}
            </p>
            <p>
              <strong>Destination:</strong> {flight.destination}
            </p>
            <p>
              <strong>Departure Time:</strong> {flight.departure_time}
            </p>
            <p>
              <strong>Arrival Time:</strong> {flight.arrival_time}
            </p>
            <p>
              <strong>Aircraft:</strong> {flight.aircraft}
            </p>
            <p>
              <strong>Pilot:</strong> {flight.pilot}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
