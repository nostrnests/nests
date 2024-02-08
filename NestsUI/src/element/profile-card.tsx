import { useNestsApi } from "../hooks/useNestsApi";
import { useEnsureRoom } from "@livekit/components-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import Icon from "../icon";
import { ReactNode, useContext } from "react";
import classNames from "classnames";
import { NostrRoomContext } from "../hooks/nostr-room-context";
import { ProfilePageContent } from "../pages/profile";
import { NostrLink, NostrPrefix } from "@snort/system";

export default function ProfileCard({
  participant,
  pubkey,
}: {
  participant: LocalParticipant | RemoteParticipant;
  pubkey: string;
}) {
  const api = useNestsApi();
  const room = useEnsureRoom();
  const nostrRoom = useContext(NostrRoomContext);
  const isAdmin = true;

  const isSpeaker = participant.audioTracks.size > 0;
  const menuItem = (icon: string, text: ReactNode, onClick: () => void, className?: string) => {
    return (
      <div
        className={classNames(
          "flex items-center gap-3 px-4 leading-10 hover:bg-foreground transition cursor-pointer select-none",
          className,
        )}
        onClick={onClick}
      >
        <Icon name={icon} />
        <div>{text}</div>
      </div>
    );
  };
  return (
    <div className="absolute z-10 bg-foreground-2 rounded-xl py-2 overflow-hidden flex flex-col font-medium w-max">
      {menuItem("eye", "View Profile", () => {
        nostrRoom.setFlyout(<ProfilePageContent link={new NostrLink(NostrPrefix.PublicKey, pubkey)} />);
      })}
      {menuItem("user-plus", "Follow", () => {})}
      {isAdmin && (
        <>
          {menuItem(isSpeaker ? "exit" : "enter", !isSpeaker ? "Add to stage" : "Remove from stage", async () => {
            await api.updatePermissions(room.name, pubkey, !isSpeaker);
          })}
          {menuItem("mic-off", "Mute", () => {})}
          {menuItem("admin", "Make admin", () => {})}
          <hr className="mx-4 border-foreground" />
          {menuItem("minus-circle", "Ban user", () => {}, "text-delete")}
        </>
      )}
    </div>
  );
}
