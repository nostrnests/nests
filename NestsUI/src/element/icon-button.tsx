import classNames from "classnames";
import Icon from "../icon";
import Button, { ButtonProps } from "./button";
import { forwardRef } from "react";

export type IconButtonProps = {
  name: string;
  size?: number;
  height?: number;
} & ButtonProps;
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ name: iconName, size: iconSize, className, ...props }: IconButtonProps, ref) => {
    return (
      <Button
        {...props}
        className={classNames("bg-foreground-2 hover:bg-foreground-2-hover transition", className)}
        ref={ref}
      >
        <Icon name={iconName} size={iconSize} />
        {props.children}
      </Button>
    );
  },
);
export default IconButton;
