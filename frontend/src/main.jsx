import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/dashboard.css";
import "./styles/pilotOnboarding.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./Root.jsx";
import { WhoAmI } from "./api/auth.js";
import { DEV_MODE } from "./devConfig.js";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import PilotDashboard from "./pages/PilotDashboard.jsx";
import GenerateToken from "./pages/GenerateToken.jsx";
import ManagePilots from "./pages/ManagePilots.jsx";
import PilotProfile from "./pages/PilotProfile.jsx";
import PilotRegistrationPage from "./pages/PilotRegistrationPage.jsx";
import { TokenStoreProvider } from "./services/tokenStore.jsx";

// Helper: attach a loader when not in DEV_MODE
const guard = (loader) => (DEV_MODE ? undefined : loader);

let router = createBrowserRouter([
  {
    path: "/",

    loader: guard(WhoAmI),
    Component: Root,
  },
  {
    path: "/home",
    loader: guard(WhoAmI),
    Component: Home,
  },
  {
    path: "/login",
    Component: Login,
  },

  //admin pages (requires "administrative" authorisation)
  {
    path: "admin/generate-token",
    loader: guard(WhoAmI),
    Component: GenerateToken,
  },
  {
    path: "admin/manage-pilots",
    loader: guard(WhoAmI),
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
  { path: "pilot/profile", loader: guard(WhoAmI), Component: PilotProfile },
  { path: "pilot/dashboard", loader: guard(WhoAmI), Component: PilotDashboard },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TokenStoreProvider>
      <RouterProvider router={router} />
    </TokenStoreProvider>
  </StrictMode>
);
