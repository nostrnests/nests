import { CSSProperties, ReactNode } from "react";
import IconButton from "./icon-button";
import { createPortal } from "react-dom";

export default function Flyout({
  show,
  children,
  onClose,
}: {
  show: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  const styles = {
    transition: "all 0.2s ease-in-out",
    transform: `translate(${show ? "0" : "var(--chat-w)"},0)`,
  } as CSSProperties;

  return createPortal(
    <div className={`absolute z-20 top-0 right-0 w-chat overflow-hidden ${show ? "" : "pointer-events-none"}`}>
      <div className="bg-foreground h-[100dvh] px-3 py-4" style={styles}>
        <IconButton name="x" className="rounded-xl w-10 h-10 mb-6" size={16} onClick={onClose} />
        {children}
      </div>
    </div>,
    document.body,
  );
}
