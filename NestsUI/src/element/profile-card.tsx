import { useNestsApi } from "../hooks/useNestsApi";
import { useEnsureRoom } from "@livekit/components-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import Icon from "../icon";
import { ReactNode } from "react";
import classNames from "classnames";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { ProfilePageContent } from "../pages/profile";
import { NostrLink, NostrPrefix } from "@snort/system";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useLogin } from "../login";

export default function ProfileCard({
  participant,
  pubkey,
}: {
  participant: LocalParticipant | RemoteParticipant;
  pubkey: string;
}) {
  const api = useNestsApi();
  const login = useLogin();
  const room = useEnsureRoom();
  const nostrRoom = useNostrRoom();
  const isLoginAdmin = useIsAdmin();
  const thisIsAdmin = nostrRoom.info?.admins.includes(pubkey);
  const thisIsHost = pubkey === nostrRoom.info?.host;
  const isSelf = pubkey === login.pubkey;

  const isSpeaker = participant.audioTracks.size > 0;
  const isMuted = !participant.isMicrophoneEnabled;
  const menuItem = (icon: string, text: ReactNode, onClick: () => void, className?: string) => {
    return (
      <div
        className={classNames(
          "flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4 hover:bg-foreground hover:text-primary transition cursor-pointer select-none",
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
    <div className="absolute z-10 bg-foreground-2 rounded-xl overflow-hidden flex flex-col font-medium w-max">
      {menuItem("eye", "View Profile", () => {
        nostrRoom.setFlyout(<ProfilePageContent link={new NostrLink(NostrPrefix.PublicKey, pubkey)} />);
      })}
      {menuItem("user-plus", "Follow", () => { })}
      {isLoginAdmin && (
        <>
          {menuItem(isSpeaker ? "exit" : "enter", !isSpeaker ? "Add to stage" : isSelf ? "Leave stage" : "Remove from stage", async () => {
            await api.updatePermissions(room.name, pubkey, { can_publish: !isSpeaker });
          })}
          {!isMuted && menuItem("mic-off", "Mute", async () => {
            await api.updatePermissions(room.name, pubkey, { mute_microphone: true });
          })}
          {!thisIsAdmin && !thisIsHost && menuItem("admin", "Make admin", async () => {
            await api.updatePermissions(room.name, pubkey, { is_admin: true });
          })}
          {thisIsAdmin && !thisIsHost && menuItem("admin", "Remove admin", async () => {
            await api.updatePermissions(room.name, pubkey, { is_admin: false });
          })}
          {!isSelf && !thisIsHost && <>
            <hr className="mx-4 border-foreground" />
            {menuItem("minus-circle", "Ban user", () => { }, "text-delete hover:text-delete")}
          </>}
        </>
      )}
    </div>
  );
}
