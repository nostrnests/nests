import { Outlet } from "react-router-dom";

export default function Layout() {
    return <div className="w-[720px] mx-auto">
        <Outlet />
    </div>
}