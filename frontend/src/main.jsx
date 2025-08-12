import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/dashboard.css";
import "./styles/PilotOnboarding.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./Root.jsx";
import { WhoAmI } from "./api/auth.js";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import PilotDashboard from "./pages/PilotDashboard.jsx";
import GenerateToken from "./pages/GenerateToken.jsx";
import ManagePilots from "./pages/ManagePilots.jsx";
import PilotProfile from "./pages/PilotProfile.jsx";
import PilotRegistrationPage from "./pages/PilotRegistrationPage.jsx";
import { TokenStoreProvider } from "./services/tokenStore.jsx";

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

  //admin pages (requires "administrative" authorisation)
  {
    path: "admin/generate-token",
    loader: WhoAmI,
    Component: GenerateToken,
  },
  {
    path: "admin/manage-pilots",
    loader: WhoAmI,
    Component: ManagePilots,
  },
  //Create path to Ground Control Dashboard here:
  //{},

  //Through link in email
  {
    path: "/register/new",
    Component: PilotRegistrationPage,
  },
  //pilot portal pages (require "pilot" authorisation)
  { path: "pilot/profile", loader: WhoAmI, Component: PilotProfile },
  { path: "pilot/dashboard", loader: WhoAmI, Component: PilotDashboard },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TokenStoreProvider>
      <RouterProvider router={router} />
    </TokenStoreProvider>
  </StrictMode>
);
