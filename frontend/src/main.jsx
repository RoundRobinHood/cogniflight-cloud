import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/dashboard.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./Root.jsx";
import { WhoAmI } from "./api/auth.js";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import RegistrationForm from "./pages/RegistrationForm";
import PilotDashboard from "./pages/PilotDashboard";

let router = createBrowserRouter([
  {
    path: "/",
    loader: WhoAmI,
    Component: Root,
  },
  {
    path: "/home",
    loader: WhoAmI,
    Component: Home,
  },
  {
    path: "/login",
    Component: Login,
  },
  { path: "/dashboard", Component: PilotDashboard },
  {
    path: "/register",
    element: <RegistrationForm />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
