import { Link } from "react-router-dom";
import { useTokenStore } from "../services/tokenStore";

export default function DevMenu() {
  const tokenStore = useTokenStore();
  //create demo token and seed data:
  const seedDemo = () => {
    tokenStore.set?.("DEMO", {
      name: "Janina",
      surname: "Labuscagne",
      licenseNo: "SAF-123456",
      email: "janina.l@wings.co.za",
    });
  };
  return (
    <div style={{ padding: "2rem" }}>
      <div>
        {" "}
        <p> Backend loaders disabled; auth checks bypassed.</p>
        <button type="button" onClick={seedDemo}>
          Seed demo token
        </button>
      </div>
      <h2>DEV MENU</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <Link to="/pilot/dashboard">Pilot Dashboard</Link>
        </li>
        <li>
          <Link to="/pilot/profile">Pilot Profile</Link>
        </li>
        <li>
          <Link to="/admin/generate-token">Admin: Generate Token</Link>
        </li>
        <li>
          <Link to="/admin/manage-pilots">Admin: Manage Pilots</Link>
        </li>
        <li>
          <Link to="/register/new?token=DEMO">
            Pilot Registration (demo token)
          </Link>
        </li>
        <li>
          <Link to="/home">Home (role-based menu)</Link>
        </li>
        <li>
          <Link to="/login">Login</Link>
        </li>
      </ul>
    </div>
  );
}
