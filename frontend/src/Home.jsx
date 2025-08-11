import { Link, Navigate, useLoaderData } from "react-router-dom";
import { DEV_MODE } from "./devConfig";

function Home() {
  //In Dev mode no loader is used, so this will be undefined. Default to {} then.
  const authStatus = useLoaderData() ?? {};

  const user = authStatus.user;

  //If not in Dev mode - keep guard/redirect to login:
  if (!DEV_MODE) {
    if (!authStatus.authorized || !user) {
      console.error("Not logged in. Redirecting to login");
      return <Navigate to="/login" />;
    }
  }

  // Safe fallbacks for dev mode
  const role = authStatus.user?.role ?? "pilot";
  const name = authStatus.user?.name ?? "Guest";
  const isAdmin = role === "admin";

  return (
    <>
      <h1>
        Welcome to the {role} dashboard, {name}!
      </h1>

      {/*Pilot-side (available to pilots && admins*/}
      <section style={{ marginTop: "1rem" }}>
        <h3>Pilot</h3>
        <ul>
          <li>
            <Link to="/pilot/profile">Manage Profile</Link>
          </li>
          <li>
            <Link to="/pilot/dashboard">View Dashboard</Link>
          </li>
        </ul>
      </section>

      {/* Admin-only */}
      {isAdmin && (
        <section style={{ marginTop: "1rem" }}>
          <h3>Administrator</h3>
          <ul>
            <li>
              <Link to="/admin/generate-token">Generate Token</Link>
            </li>
            <li>
              <Link to="/admin/manage-pilots">Manage Pilots</Link>
            </li>
          </ul>
        </section>
      )}
    </>
  );
}

export default Home;
