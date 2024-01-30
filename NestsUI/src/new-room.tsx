import { useState } from "react";
import { getToken } from "./api";
import Button from "./button";
import { useNavigate } from "react-router-dom";

export default function NewRoom() {
    const [name, setName] = useState("");
    const navigate = useNavigate();

    return <div className="w-64 p-2 flex flex-col gap-4 items-center">
        <div className="text-3xl">
            Create Room
        </div>
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <Button onClick={async () => {
            const token = await getToken(name);
            if (token) {
                navigate(`/room/${encodeURIComponent(name)}`, {
                    state: token.token
                });
            }
        }}>
            Join
        </Button>
    </div>
}