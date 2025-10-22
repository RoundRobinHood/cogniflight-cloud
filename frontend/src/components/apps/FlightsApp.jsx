import { useEffect, useState } from "react";
import { usePipeClient } from "../../api/socket";
import { useSystem } from "../useSystem";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/app-base.css";
import "../../styles/apps/flights-app.css";
import "../../styles/utilities/modal.css";
import FlightsDetails from "./FlightsDetails";

export default function FlightsApp() {
  const client = usePipeClient();
  const { addNotification } = useSystem();

  const [flights, setFlights] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);

  // ✅ Reverted: working backend fetch method
  useEffect(() => {
    if (!client) return;

    async function loadFlights() {
      try {
        setLoading(true);
        // This was the working backend method in your previous version
        const data = await client.get_flights(true); // ✅ restored
        console.log("Loaded flights data:", data);
        setFlights(data);
      } catch (err) {
        console.error("Error loading flights:", err);
        setError("Unable to load flight data");
      } finally {
        setLoading(false);
      }
    }

    loadFlights();
  }, [client]);

  // 🔎 Search filtering (case-insensitive)
  const filtered = flights.filter((f) => {
    const s = search.toLowerCase();
    return (
      f.flight_number?.toLowerCase().includes(s) ||
      f.pilot?.toLowerCase().includes(s) ||
      f.origin?.toLowerCase().includes(s) ||
      f.destination?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="app-base flights-app">
      <header className="flights-toolbar">
        <h2 className="flights-title">Flights</h2>

        <div className="flights-search">
          <div className="flights-search-field">
            <span className="flights-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by flight number, pilot, or route"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flights-search-input"
              autoComplete="off"
            />
          </div>
        </div>
      </header>

      <div className="app-content">
        <table className="table table--zebra">
          <thead>
            <tr>
              <th>Flight No.</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Pilot</th>
              <th>Departure</th>
              <th>Arrival</th>
              <th className="table-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  Loading flights...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  {search
                    ? `No flights found matching "${search}"`
                    : "No flight data available"}
                </td>
              </tr>
            ) : (
              filtered.map((flight, i) => (
                <tr key={i}>
                  <td>{flight.flight_number || "-"}</td>
                  <td>{flight.origin || "-"}</td>
                  <td>{flight.destination || "-"}</td>
                  <td>{flight.pilot || "-"}</td>
                  <td>{flight.departure_time || "-"}</td>
                  <td>{flight.arrival_time || "-"}</td>
                  <td className="table-col-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedFlight(flight)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="app-footer">
        <button
          className="btn btn-primary"
          onClick={() =>
            addNotification("Flight report generation coming soon!", "info")
          }
        >
          Generate Report
        </button>
      </footer>

      {/* Modal for flight details */}
      {selectedFlight && (
        <FlightsDetails
          flight={selectedFlight}
          onClose={() => setSelectedFlight(null)}
        />
      )}
    </div>
  );
}
