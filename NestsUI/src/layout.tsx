import { Link, Outlet, useNavigate } from "react-router-dom";
import { PrimaryButton } from "./element/button";
import Logo from "./element/logo";
import Icon from "./icon";

export default function Layout() {
    return <div>
        <div className="flex justify-between px-10 pt-8 pb-1 items-center">
            <Logo />
            <div>
                <Link to="/new">
                    <PrimaryButton>
                        New Room
                    </PrimaryButton>
                </Link>
            </div>
        </div>
        <Outlet />
    </div>
}

export function BackLayout() {
    const navigate = useNavigate();
    return <div>
        <div className="px-4 py-6 flex gap-2 items-center text-highlight cursor-pointer" onClick={() => navigate(-1)}>
            <Icon name="chevron" />
            Back
        </div>
        <Outlet />
    </div>
}