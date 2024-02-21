import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link to="/">
      <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center text-2xl font-bold select-none">
        N
      </div>
    </Link>
  );
}
