import Icon, { IconProps } from "../icon";
import Button, { ButtonProps } from "./button";

export type IconButtonProps = IconProps & ButtonProps;
export default function IconButton({ name: iconName, size: iconSize, ...props }: IconButtonProps) {
    return <Button {...props} className="rounded-full aspect-square bg-foreground-2">
        <Icon name={iconName} size={iconSize} />
    </Button>
}