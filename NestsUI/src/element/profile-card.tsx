import { hexToBech32 } from "@snort/shared";
import { CachedMetadata } from "@snort/system";
import Avatar from "./avatar";
import { PrimaryButton } from "./button";
import { useNestsApi } from "../hooks/useNestsApi";
import { useEnsureRoom } from "@livekit/components-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";

export default function ProfileCard({ participant, pubkey, profile }: { participant: LocalParticipant | RemoteParticipant, pubkey: string; profile?: CachedMetadata }) {
  const api = useNestsApi();
  const room = useEnsureRoom();

  async function bringToStage() {
    await api.updatePermissions(room.name, pubkey, !participant.isMicrophoneEnabled);
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Avatar pubkey={pubkey} size={40} link={true} />
          <div>{profile?.display_name ?? profile?.name ?? hexToBech32("npub", pubkey).slice(0, 12)}</div>
        </div>
        <PrimaryButton>Follow</PrimaryButton>
      </div>
      <p>{profile?.about}</p>
      <div>
        <PrimaryButton onClick={bringToStage}>{participant.isMicrophoneEnabled ? "Remove from Stage" : "Bring to Stage"}</PrimaryButton>
      </div>
    </>
  );
}
