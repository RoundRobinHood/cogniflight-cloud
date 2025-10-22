import { useEffect, useState } from "react";
import { usePipeClient } from "../../api/socket";
import { useSystem } from "../useSystem";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/app-base.css"; // for consistent window padding etc.
import "../../styles/apps/pilots-app.css"; // optional pilots-specific styling
import "../../styles/utilities/modal.css";
import PilotsDetails from "./PilotsDetails";

export default function PilotsApp() {
  const client = usePipeClient();
  const { addNotification } = useSystem();
  const [selectedPilot, setSelectedPilot] = useState(null);
  const [pilots, setPilots] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Selected pilot:", selectedPilot);
  }, [selectedPilot]);

  // Fetch pilots from backend
  useEffect(() => {
    if (!client) return;

    async function loadPilots() {
      try {
        setLoading(true);
        const data = await client.get_pilots(true); // verbose = true → full info
        console.log("Loaded pilots data:", data);
        setPilots(data);
      } catch (err) {
        console.error("Error loading pilots:", err);
        setError("Unable to load pilots");
      } finally {
        setLoading(false);
      }
    }

    loadPilots();
  }, [client]);

  // Filter logic
  const filtered = pilots.filter(
    (p) =>
      p.surname?.toLowerCase().includes(search.toLowerCase()) ||
      p.license_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-base">
      <header className="pilots-toolbar">
        <h2 className="pilots-title">Pilots</h2>

        <div className="pilots-search">
          <div className="pilots-search-field">
            <span className="pilots-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Enter surname or license number"
              value={search}
              onChange={(e) => setSearch(e.target.value.trimStart())}
              className="pilots-search-input"
              autoComplete="off"
            />
          </div>
        </div>
      </header>
      <div className="app-content">
        <table className="table table--zebra">
          <thead>
            <tr>
              <th>Name</th>
              <th>Surname</th>
              <th>Email</th>
              <th>License No.</th>
              <th className="table-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="table-empty">
                  Loading pilots...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className="table-empty">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-empty">
                  {search
                    ? `No pilots found matching "${search}"`
                    : "No pilot data available"}
                </td>
              </tr>
            ) : (
              filtered.map((pilot, i) => (
                <tr key={i}>
                  <td>{pilot.name || "-"}</td>
                  <td>{pilot.surname || "-"}</td>
                  <td>{pilot.email || "-"}</td>
                  <td>{pilot.license_number || "-"}</td>
                  <td className="table-col-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedPilot(pilot)}
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
        {/* <button
          className="btn btn-primary"
          onClick={() =>
            addNotification("Pilot report generation coming soon!", "info")
          }
        >
          Generate Report
        </button> */}
      </footer>
      {selectedPilot && (
        <PilotsDetails
          pilot={selectedPilot}
          onClose={() => setSelectedPilot(null)}
        />
      )}
    </div>
  );
}
