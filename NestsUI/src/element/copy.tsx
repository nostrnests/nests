import { useCopy } from "../hooks/useCopy";
import Icon from "../icon";

import classNames from "classnames";

export interface CopyProps {
  text: string;
  maxSize?: number;
  className?: string;
  mask?: string;
}
export default function Copy({ text, maxSize = 32, className, mask }: CopyProps) {
  const { copy, copied } = useCopy();
  const sliceLength = maxSize / 2;
  const displayText = mask ? mask.repeat(text.length) : text;
  const trimmed =
    displayText.length > maxSize
      ? `${displayText.slice(0, sliceLength)}...${displayText.slice(-sliceLength)}`
      : displayText;

  return (
    <div className={classNames("flex pointer gap-2 items-center", className)} onClick={() => copy(text)}>
      <span className="copy-body">{trimmed}</span>
      <span className="icon" style={{ color: copied ? "var(--success)" : "var(--highlight)" }}>
        {copied ? <Icon name="check" size={14} /> : <Icon name="copy-solid" size={14} />}
      </span>
    </div>
  );
}
