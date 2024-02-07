import "./index.css";
import "./fonts/inter.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { RouteObject, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout, { BackLayout } from "./pages/layout";
import { SnortContext } from "@snort/system-react";
import { NostrSystem } from "@snort/system";
import { setLogLevel } from "livekit-client";
import { DefaultRelays } from "./const";
import RoomList from "./pages/room-list";
import NewRoom from "./pages/new-room";
import { loadSession } from "./login";
import SignUp from "./element/sign-up";
import Login from "./element/login";
import NostrRoute from "./pages/nostr-route";

import { WasmOptimizer, hasWasm, wasmInit } from "./wasm";

async function routeInit() {
  await loadSession();
  await wasmInit();
}

const routes = [
  {
    element: <Layout />,
    loader: async () => {
      await routeInit();
      return null;
    },
    children: [
      {
        path: "/",
        element: (
          <>
            <RoomList />
          </>
        ),
      },
      {
        path: "/sign-up",
        element: (
          <div className="flex flex-col items-center justify-center mt-[20vh]">
            <div className="modal-body">
              <SignUp />
            </div>
          </div>
        ),
      },
      {
        path: "/login",
        element: (
          <div className="flex flex-col items-center justify-center mt-[20vh]">
            <div className="modal-body">
              <Login />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    element: <BackLayout />,
    loader: async () => {
      await routeInit();
      return null;
    },
    children: [
      {
        path: "/new",
        element: <NewRoom />,
      },
    ],
  },
  {
    path: "/:id",
    loader: async () => {
      await routeInit();
      return null;
    },
    element: <NostrRoute />,
  },
] as Array<RouteObject>;
const router = createBrowserRouter(routes);

const snortSystem = new NostrSystem({
  optimizer: hasWasm ? WasmOptimizer : undefined,
});
DefaultRelays.forEach((r) => snortSystem.ConnectToRelay(r, { read: true, write: true }));

setLogLevel("debug");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SnortContext.Provider value={snortSystem}>
      <RouterProvider router={router} />
    </SnortContext.Provider>
  </React.StrictMode>,
);
