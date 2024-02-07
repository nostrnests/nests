import { Link } from "react-router-dom";
import { PrimaryButton } from "./button";
import { loginWith } from "../login";

export default function Login() {
  return (
    <div className="flex flex-col gap-6 items-center justify-center">
      <h1>Sign in</h1>
      <PrimaryButton
        onClick={async () => {
          await loginWith("nip7");
        }}
      >
        Sign in with extension
      </PrimaryButton>
      <Link to="/sign-up" className="text-highlight">
        Create a nostr account
      </Link>
    </div>
  );
}
