import { ReactNode } from "react";

export function AvatarStack({ children }: { children: ReactNode }) {
    return <div className="stack">
        {children}
    </div>
}