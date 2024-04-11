import { CSSProperties, ReactNode } from "react";
import IconButton from "./icon-button";
import { createPortal } from "react-dom";
import classNames from "classnames";

export default function Flyout({
  show,
  children,
  onClose,
  side,
}: {
  show: boolean;
  children: ReactNode;
  onClose: () => void;
  side: "left" | "right";
}) {
  const styles = {
    transition: "all 0.2s ease-in-out",
    transform:
      side === "right"
        ? `translate(${show ? "0" : "var(--chat-w)"},0)`
        : `translate(${show ? "0" : "calc(-1 * var(--chat-w))"},0)`,
  } as CSSProperties;

  return createPortal(
    <div
      className={classNames("absolute z-20 top-0 w-chat overflow-hidden", {
        "pointer-events-none": !show,
        "right-0": side == "right",
        "left-0": side === "left",
      })}
    >
      <div className="bg-foreground-2 h-[100dvh] px-3 py-4" style={styles}>
        <IconButton name="x" className="rounded-xl w-10 h-10 mb-6" size={16} onClick={onClose} />
        {children}
      </div>
    </div>,
    document.body,
  );
}
