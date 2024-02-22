import "./index.css";
import "./fonts/inter.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { RouteObject, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout, { BackLayout } from "./pages/layout";
import { SnortContext } from "@snort/system-react";
import { SnortSystemDb } from "@snort/system-web";
import { NostrSystem } from "@snort/system";
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
import { loginHook } from "./login";

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

async function routeInit() {
  await wasmInit();
  const session = loginHook(snortSystem);
  const bufferList = session.pubkey ? [session.pubkey, ...(session.follows?.filter(a => a[0] === "p").map(a => a[1]) ?? [])] : undefined;
  await snortSystem.Init(bufferList);
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
          <div className="flex flex-col items-center justify-center mt-[20dvh]">
            <div className="modal-body">
              <SignUp />
            </div>
          </div>
        ),
      },
      {
        path: "/login",
        element: (
          <div className="flex flex-col items-center justify-center mt-[20dvh]">
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

export const snortSystem = new NostrSystem({
  optimizer: hasWasm ? WasmOptimizer : undefined,
  automaticOutboxModel: false,
  db: new SnortSystemDb(),
  buildFollowGraph: true,
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
