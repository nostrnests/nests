import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { RouteObject, RouterProvider, createBrowserRouter } from 'react-router-dom'
import Layout from './layout'
import NewRoom from './new-room'
import { SnortContext } from '@snort/system-react'
import { NostrSystem } from '@snort/system'
import Room from './room'

const routes = [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <NewRoom />
      },
      {
        path: "/room/:id",
        element: <Room />
      }
    ]
  }

] as Array<RouteObject>;
const router = createBrowserRouter(routes);

const snortSystem = new NostrSystem({});
["wss://relay.snort.social"].forEach(r => snortSystem.ConnectToRelay(r, { read: true, write: true }));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SnortContext.Provider value={snortSystem} >
      <RouterProvider router={router} />
    </SnortContext.Provider>
  </React.StrictMode>,
)
