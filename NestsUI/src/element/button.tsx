import classNames from "classnames";
import { HTMLProps, forwardRef, useState } from "react";
import Spinner from "./spinner";

export type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, "onClick"> & {
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
  loading?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, onClick, className, loading, ...props }: ButtonProps, ref) => {
    const [lx, setLoading] = useState(loading);
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        className={classNames("py-2 px-3 relative font-semibold leading-5 select-none", className)}
        onClick={async (e) => {
          if (onClick) {
            e.stopPropagation();
          }
          try {
            setLoading(true);
            await onClick?.(e);
          } finally {
            setLoading(false);
          }
        }}
      >
        {lx && (
          <span className="absolute w-full h-full top-0 left-0 flex items-center justify-center">
            <Spinner />
          </span>
        )}
        <span className={lx ? "invisible" : ""}>{children}</span>
      </button>
    );
  },
);

const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(({ className, ...props }: ButtonProps, ref) => {
  return (
    <Button {...props} className={classNames("rounded-full bg-primary hover:bg-primary/90", className)} ref={ref} />
  );
});
const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps>(({ className, ...props }: ButtonProps, ref) => {
  return (
    <Button
      {...props}
      className={classNames("rounded-full bg-foreground-2 hover:bg-foreground-2/90", className)}
      ref={ref}
    />
  );
});
export { PrimaryButton, SecondaryButton };
export default Button;
