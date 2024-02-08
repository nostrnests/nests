import { Link } from "react-router-dom";
import { PrimaryButton } from "./button";
import Logo from "./logo";
import Avatar from "./avatar";
import { useLogin } from "../login";

export default function Header() {
  const login = useLogin();
  return (
    <div className="flex justify-between lg:px-10 max-lg:px-4 lg:pt-8 max-lg:pt-3 pb-1 items-center">
      <Logo />
      <div className="flex gap-4 items-center">
        {!login.pubkey && (
          <>
            <Link to="/login">
              <PrimaryButton>Login</PrimaryButton>
            </Link>
          </>
        )}
        {login.pubkey && (
          <>
            <Link to="/new">
              <PrimaryButton>New Room</PrimaryButton>
            </Link>
            <Avatar pubkey={login.pubkey} link={true} size={40} />
          </>
        )}
      </div>
    </div>
  );
}
