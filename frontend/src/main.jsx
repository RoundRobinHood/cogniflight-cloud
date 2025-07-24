import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Root from './Root.jsx'
import { WhoAmI } from './api/auth.js'
import Home from './Home.jsx'
import Login from './Login.jsx'

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
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
