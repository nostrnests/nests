import { Link } from "react-router-dom";
import NestsLogo from "../nests-logo.svg";

export default function Logo() {
  return (
    <Link to="/">
      <img src={NestsLogo} alt="Nests" className="w-12 h-12" />
    </Link>
  );
}
