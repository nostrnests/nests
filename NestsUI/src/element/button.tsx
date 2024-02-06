import classNames from "classnames";
import { HTMLProps, useState } from "react";
import Spinner from "./spinner";

export type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, "onClick"> & {
    onClick?: (e: React.MouseEvent) => Promise<void> | void
};

export default function Button({ children, onClick, className, ...props }: ButtonProps) {
    const [loading, setLoading] = useState(false);
    return <button {...props} type="button" className={classNames("py-2 px-3 hover:opacity-80 relative font-semibold text-sm select-none", className)} onClick={async e => {
        try {
            setLoading(true);
            await onClick?.(e);
        } finally {
            setLoading(false);
        }
    }}>
        {loading && <span className="absolute w-full h-full top-0 left-0 flex items-center justify-center">
            <Spinner />
        </span>}
        <span className={loading ? "invisible" : ""}>{children}</span>
    </button>
}

export function PrimaryButton({ className, ...props }: ButtonProps) {
    return <Button {...props} className={classNames("rounded-full bg-primary", className)} />
}