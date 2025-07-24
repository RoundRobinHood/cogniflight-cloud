import { Navigate, useLoaderData, useNavigate } from "react-router-dom"


function Home() {
  const authStatus = useLoaderData();
  if(!authStatus.authorized || !authStatus.user) {
    console.error("Not logged in. Redirecting to login");
    return <Navigate to="/login" />
  }

  return (
    <>
      <h1> Welcome to the {authStatus.user.role} dashboard, {authStatus.user.name}! </h1>
    </>
  );
}

export default Home
