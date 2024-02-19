import { HTMLProps, forwardRef, useState } from "react";
import Spinner from "./spinner";
import classNames from "classnames";

export type AsyncProps = Omit<HTMLProps<HTMLDivElement>, "onClick"> & {
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
  loading?: boolean;
};

const Async = forwardRef<HTMLDivElement, AsyncProps>(
  ({ children, onClick, loading, className, ...props }: AsyncProps, ref) => {
    const [lx, setLoading] = useState(loading);
    return (
      <div
        {...props}
        className={classNames(className, "relative")}
        ref={ref}
        onClick={async (e) => {
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
      </div>
    );
  },
);

export default Async;
