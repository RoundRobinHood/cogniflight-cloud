import { Link, Navigate, useLoaderData } from "react-router-dom";

function Home() {
  const authStatus = useLoaderData();
  const authorized = authStatus?.authorized === true;

  const user = authStatus?.user;

  if (!authStatus.authorized) {
    console.error("Not logged in. Redirecting to login");
    return <Navigate to="/login" />;
  }

  const role = user.role;
  const name = user.name;
  const isAdmin = role === "sysadmin";
  const isPilot = role === "pilot";
  const isUser = role === "atc";
  console.log("authStatus:", authStatus);

  return (
    <>
      <h1>Welcome to Cogniflight, {name}!</h1>

      {/*Pilot-side (available to pilots and admins*/}
      {(isPilot || isAdmin) && (
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
      )}
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
