import { useEffect, useState } from "react";

const breakpoint = 640;
export default function useIsMobile() {
  const [state, setState] = useState(1920);

  useEffect(() => {
    const handler = () => {
      setState(window.outerWidth);
    };
    window.addEventListener("resize", handler);
    setState(window.outerWidth);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return state <= breakpoint;
}
