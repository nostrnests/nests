import "./index.css";
import "./fonts/inter.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { RouteObject, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout, { BackLayout } from "./pages/layout";
import { SnortContext } from "@snort/system-react";
import { NostrSystem } from "@snort/system";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { setLogLevel } from "livekit-client";
import RoomList from "./pages/room-list";
import NewRoom from "./pages/new-room";
import SignUp from "./element/sign-up";
import Login from "./element/login";
import NostrRoute from "./pages/nostr-route";

import { WasmOptimizer, hasWasm, wasmInit } from "./wasm";

import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import IntlContext from "./intl";
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

async function routeInit() {
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
  automaticOutboxModel: false,
});

setLogLevel("debug");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SnortContext.Provider value={snortSystem}>
      <IntlContext>
        <RouterProvider router={router} />
      </IntlContext>
    </SnortContext.Provider>
  </React.StrictMode>,
);

export function updateRelays(relays: Array<string>) {
  relays = removeUndefined(relays.map(a => sanitizeRelayUrl(a)));
  console.debug("Connecting to relays for room", relays);
  relays.forEach(a => snortSystem.ConnectToRelay(a, { read: true, write: true }));

  const removing = [...snortSystem.pool].filter(([k,]) => !relays.some(b => b === k)).map(([k,]) => k);
  console.debug("Disconnecting relays for room", removing);
  removing.forEach(a => snortSystem.DisconnectRelay(a));
}