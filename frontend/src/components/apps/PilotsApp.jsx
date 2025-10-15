import { useEffect, useState } from "react";
import { usePipeClient } from "../../api/cmd-socket";
import "../../styles/utilities/tables.css";
import "../../styles/utilities/pills.css";
import "../../styles/apps/app-base.css"; // for consistent window padding etc.
import "../../styles/apps/pilots-app.css"; // optional pilots-specific tweaks

export default function PilotsApp() {
  const client = usePipeClient();
  const [pilots, setPilots] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch pilots from backend
  useEffect(() => {
    if (!client) return;

    async function loadPilots() {
      try {
        setLoading(true);
        const data = await client.get_pilots(true); // verbose = true → full info
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
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.surname?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-base">
      <header className="app-header">
        <h2>Pilots</h2>
        <div className="app-actions">
          <input
            type="text"
            placeholder="Search pilots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      <div className="app-content">
        <table className="table table--zebra">
          <thead>
            <tr>
              <th>Name</th>
              <th>License</th>
              <th>Flight Hours</th>
              <th>Role</th>
              <th className="table-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Always render table structure, even if empty */}
            {pilots.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-empty">
                  No pilot data available
                </td>
              </tr>
            ) : (
              pilots.map((pilot, i) => (
                <tr key={i}>
                  <td>{pilot.name || pilot.username}</td>
                  <td>{pilot.license_number || "-"}</td>
                  <td>{pilot.total_flight_hours || 0}</td>
                  <td>
                    <span className="pill pill--pilot">Pilot</span>
                  </td>
                  <td className="table-col-actions">
                    <button className="btn btn-sm btn-secondary">
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
        <button className="btn btn-primary">Generate Report</button>
      </footer>
    </div>
  );
}
