import { Link } from "react-router-dom";
import { PrimaryButton } from "./button";
import Logo from "./logo";
import Avatar from "./avatar";
import { useLogin } from "../login";

export default function Header() {
  const login = useLogin();
  return (
    <div className="flex justify-between px-10 pt-8 pb-1 items-center">
      <Logo />
      <div className="flex gap-4 items-center">
        <Link to="/new">
          <PrimaryButton>New Room</PrimaryButton>
        </Link>
        {login.pubkey && <Avatar pubkey={login.pubkey} link={true} size={40} />}
      </div>
    </div>
  );
}
