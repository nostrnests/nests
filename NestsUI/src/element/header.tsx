import { Link } from "react-router-dom";
import { PrimaryButton } from "./button";
import Logo from "./logo";

export default function Header() {
  return (
    <div className="flex justify-between px-10 pt-8 pb-1 items-center">
      <Logo />
      <div>
        <Link to="/new">
          <PrimaryButton>New Room</PrimaryButton>
        </Link>
      </div>
    </div>
  );
}
