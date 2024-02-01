import classNames from "classnames";
import { HTMLProps, useState } from "react";

export type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, "onClick"> & {
    onClick?: (e: React.MouseEvent) => Promise<void>
};

export default function Button({ children, onClick, className, ...props }: ButtonProps) {
    const [loading, setLoading] = useState(false);
    return <button {...props} type="button" className={classNames("py-2 px-3 rounded-full bg-[var(--highlight)] hover:opacity-80 relative font-semibold text-sm", className)} onClick={async e => {
        try {
            setLoading(true);
            await onClick?.(e);
        } finally {
            setLoading(false);
        }
    }}>
        {loading && <span className="absolute w-full h-full top-0 left-0 flex items-center justify-center">
            <div className="animate spin"></div>
        </span>}
        <span className={loading ? "invisible" : ""}>{children}</span>
    </button>
}