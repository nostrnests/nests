import { HTMLProps, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Button({ children, type, onClick, ...props }: Omit<HTMLProps<HTMLButtonElement>, "onClick"> & {
    onClick?: (e: React.MouseEvent) => Promise<void>
}) {
    const [loading, setLoading] = useState(false);
    return <button {...props} type="button" className="py-2 px-3 rounded-xl bg-slate-700 border border-slate-500 hover:bg-slate-600 hover:bg-slate-400 animate min-w-20 relative" onClick={async e => {
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