import { Navigate, useLoaderData, useNavigate } from "react-router-dom";
import DevMenu from "./pages/DevMenu.jsx";
import { DEV_MODE } from "./devConfig.js";

function Root() {
  if (DEV_MODE) {
    return <DevMenu />;
  }

  //Normal behaviour:
  const authStatus = useLoaderData();
  if (authStatus.authorized) {
    return <Navigate to="/home" />;
  } else {
    return <Navigate to="/login" />;
  }
}

export default Root;
