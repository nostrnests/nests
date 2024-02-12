import classNames from "classnames";
import { HTMLProps, forwardRef, useState } from "react";
import Spinner from "./spinner";

export type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, "onClick"> & {
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, onClick, className, ...props }: ButtonProps, ref) => {
    const [loading, setLoading] = useState(false);
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        className={classNames("py-2 px-3 hover:opacity-80 relative font-semibold leading-7 select-none", className)}
        onClick={async (e) => {
          try {
            setLoading(true);
            await onClick?.(e);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading && (
          <span className="absolute w-full h-full top-0 left-0 flex items-center justify-center">
            <Spinner />
          </span>
        )}
        <span className={loading ? "invisible" : ""}>{children}</span>
      </button>
    );
  },
);

const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(({ className, ...props }: ButtonProps, ref) => {
  return <Button {...props} className={classNames("rounded-full bg-primary", className)} ref={ref} />;
});
export { PrimaryButton };
export default Button;
