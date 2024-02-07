import { Link } from "react-router-dom";
import { PrimaryButton } from "./button";

export default function SignUp() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center">Create an account</h1>
      <input type="text" placeholder="Recovery email" />
      <input type="text" placeholder="Username" />
      <p>You can change your username any time</p>
      <input type="password" placeholder="Password" />
      <PrimaryButton>Create account</PrimaryButton>
      <p className="text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-highlight">
          Sign in
        </Link>
      </p>
    </div>
  );
}
