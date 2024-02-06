import { EventExt, NostrEvent } from "@snort/system";
import { useState } from "react";
import Button, { PrimaryButton } from "./button";
import useEventBuilder from "../hooks/useEventBuilder";
import { unixNow } from "@snort/shared";
import { useNavigate } from "react-router-dom";

export default function EditRoom({ event, onClose }: { event: NostrEvent, onClose: () => void }) {
    const [name, setName] = useState(event.tags.find(a => a[0] === "title")?.[1] ?? "");
    const [desc, setDesc] = useState(event.tags.find(a => a[0] === "description")?.[1] ?? "");
    const { system, signer } = useEventBuilder();
    const navigate = useNavigate();

    return <div className="flex flex-col gap-4">
        <h2>
            Room Settings
        </h2>
        <div>
            <div className="font-medium mb-2">
                Room name
            </div>
            <input type="text" placeholder="Insert cool name here" value={name} onChange={e => setName(e.target.value)} className="w-full" />
        </div>
        <div>
            <div className="font-medium mb-2">
                Room Description (Optional 140 chars)
            </div>
            <input type="text" placeholder="Discussing macro and other boring stuff" value={desc} onChange={e => setDesc(e.target.value)} className="w-full" />
        </div>
        <PrimaryButton>
            Save
        </PrimaryButton>
        <Button className="bg-foreground-2 rounded-full" onClick={onClose}>
            Cancel
        </Button>
        <hr />
        <Button className="bg-delete rounded-full" onClick={async () => {
            const status = event.tags.find(a => a[0] === "status")!;
            if (status[1] !== "ended") {
                status[1] = "ended";
                event.tags.push(["ends", unixNow().toString()]);
                event.id = EventExt.createId(event);
                const signed = await signer?.sign(event);
                if (signed) {
                    await system.BroadcastEvent(signed);
                    navigate("/");
                }
            }
        }}>
            Close Room
        </Button>
    </div>
}