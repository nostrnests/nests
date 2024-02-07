import classNames from "classnames";
import Icon from "../icon";
import Button, { ButtonProps } from "./button";

export type IconButtonProps = {
  name: string;
  size?: number;
  height?: number;
} & ButtonProps;
export default function IconButton({ name: iconName, size: iconSize, className, ...props }: IconButtonProps) {
  return (
    <Button {...props} className={classNames("bg-foreground-2 hover:bg-foreground-2-hover transition", className)}>
      <Icon name={iconName} size={iconSize} />
      {props.children}
    </Button>
  );
}
