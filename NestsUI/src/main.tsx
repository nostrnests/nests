import "./index.css";
import "./fonts/inter.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { RouteObject, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout, { BackLayout } from "./pages/layout";
import { SnortContext } from "@snort/system-react";
import { NostrSystem } from "@snort/system";
import { setLogLevel } from "livekit-client";
import RoomList from "./pages/room-list";
import NewRoom from "./pages/new-room";
import Home from "./pages/home";
import PrivacyPolicy from "./pages/privacy";
import SignUp from "./element/sign-up";
import Login from "./element/login";
import LoginCallback from "./pages/login-callback";
import NostrRoute from "./pages/nostr-route";

import { WasmOptimizer, hasWasm, wasmInit } from "./wasm";

import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import IntlContext from "./intl";
import { loginHook } from "./login";
import { setupWebLNWalletConfig } from "./wallet";

import WorkerVite from "@snort/worker-relay/src/worker?worker";
import { WorkerRelayInterface } from "@snort/worker-relay";

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const cacheRelay = new WorkerRelayInterface(
  import.meta.env.DEV ? new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url) : new WorkerVite(),
);

async function routeInit() {
  await wasmInit();
  await cacheRelay.init({
    databasePath: "nests.db",
    insertBatchSize: 100,
  });
  const session = loginHook(snortSystem);
  const bufferList = session.pubkey
    ? [session.pubkey, ...(session.follows?.filter((a) => a[0] === "p").map((a) => a[1]) ?? [])]
    : undefined;
  await snortSystem.Init(bufferList);
  setupWebLNWalletConfig();
}

const routes = [
  {
    path: "/",
    loader: async () => {
      await routeInit();
      return null;
    },
    element: <Home />,
  },
  {
    path: "/privacy",
    loader: async () => {
      await routeInit();
      return null;
    },
    element: <PrivacyPolicy />,
  },
  {
    element: <Layout />,
    loader: async () => {
      await routeInit();
      return null;
    },
    children: [
      {
        path: "/lobby",
        element: <RoomList />,
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
      {
        path: "/login/callback",
        element: (
          <div className="flex flex-col items-center justify-center mt-[20dvh]">
            <div className="modal-body">
              <LoginCallback />
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
  buildFollowGraph: true,
  cachingRelay: cacheRelay,
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
