import { Navigate, useLoaderData, useNavigate } from "react-router-dom";

function Root() {
  const authStatus = useLoaderData();

  if(authStatus.authorized) {
    return <Navigate to="/home"/>
  } else {
    return <Navigate to="/login"/>
  }
}

// function Root() {
//   return <Navigate to="/register" />;
// }

export default Root;
