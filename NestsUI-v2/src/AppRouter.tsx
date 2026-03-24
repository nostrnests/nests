import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

const Lobby = lazy(() => import("./pages/Lobby"));
const NewRoom = lazy(() => import("./pages/NewRoom"));
const Settings = lazy(() => import("./pages/Settings"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RoomPage = lazy(() => import("./pages/RoomPage"));

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/new" element={<NewRoom />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/room/:id" element={<RoomPage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
