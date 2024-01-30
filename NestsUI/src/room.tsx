import { LiveKitRoom } from "@livekit/components-react";
import { useLocation } from "react-router-dom";
import NostrParticipants from "./participants";

export default function Room() {
  const location = useLocation();

  return <div>
    <LiveKitRoom serverUrl="ws://localhost:7880" token={location.state as string} connect={true} audio={true}>
      <NostrParticipants />
    </LiveKitRoom>
  </div>;
}