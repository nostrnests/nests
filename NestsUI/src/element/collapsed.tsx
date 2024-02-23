import { ReactNode, useState } from "react";

export default function Collapsed({ header, children }: { header: (open: boolean) => ReactNode, children?: ReactNode }) {
    const [show, setShow] = useState(false);

    return <div>
        <div className="select-none cursor-pointer" onClick={() => setShow(s => !s)}>
            {header(show)}
        </div>
        <div className={show ? "" : "hidden"}>
            {children}
        </div>
    </div>
}