import { useEffect, useState } from "react";
import { usePipeClient } from "../../api/socket";
import { useSystem } from "../useSystem";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/app-base.css";
import "../../styles/apps/flights-app.css";

export default function FlightsApp() {
  const client = usePipeClient();
  const { addNotification, openWindow } = useSystem();

  const [flights, setFlights] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load flights from backend using iter_flights()
  useEffect(() => {
    if (!client) return;

    async function loadFlights() {
      try {
        setLoading(true);
        setError(null);

        const flightsList = [];
        for await (const flight of client.iter_flights()) {
          flightsList.push({
            flight_number: flight.id || "-",
            pilot: flight.pilot_username || "Null",
            departure_time:
              flight.departure_time ||
              flight.start_timestamp?.toLocaleString() ||
              "-",
            arrival_time: flight.arrival_time || "-",
            edge_id: flight.edge_username || "-",
            tail_number: flight.edge_username || "-",
          });
        }

        console.log("Loaded real flight data:", flightsList);
        setFlights(flightsList);
      } catch (err) {
        console.error("Error loading flights:", err);
        setError("Unable to load flight data");
      } finally {
        setLoading(false);
      }
    }

    loadFlights();
  }, [client]);

  // Search filtering (case-insensitive)
  const filtered = flights.filter((f) => {
    const s = search.toLowerCase();
    return (
      f.flight_number?.toLowerCase().includes(s) ||
      f.pilot?.toLowerCase().includes(s) ||
      f.edge_id?.toLowerCase().includes(s)
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
              placeholder="Search by flight no, pilot or edge ID"
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
              <th>Edge ID</th>
              <th>Pilot</th>
              <th>Departure</th>
              <th>Arrival</th>

              <th className="table-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  Loading flights...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  {search
                    ? `No flights found matching "${search}"`
                    : "No flight data available"}
                </td>
              </tr>
            ) : (
              filtered.map((flight, i) => (
                <tr key={i}>
                  <td>{flight.flight_number}</td>
                  <td>{flight.edge_id}</td>
                  <td>{flight.pilot}</td>
                  <td>{flight.departure_time}</td>
                  <td>{flight.arrival_time}</td>

                  <td className="table-col-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() =>
                        openWindow(
                          "flight-report",
                          `Flight Report — ${flight.flight_number}`,
                          { flight }
                        )
                      }
                    >
                      Report
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
