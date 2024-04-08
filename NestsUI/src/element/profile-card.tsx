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
import { FormattedMessage } from "react-intl";
import useFollowing from "../hooks/useFollowing";
import Async from "./async";

export default function ProfileCard({
  participant,
  pubkey,
}: {
  participant: LocalParticipant | RemoteParticipant;
  pubkey: string;
}) {
  const login = useLogin();
  const room = useEnsureRoom();
  const nostrRoom = useNostrRoom();
  const isLoginAdmin = useIsAdmin();
  const { isFollowing, follow, unfollow } = useFollowing();

  const thisIsAdmin = nostrRoom.info?.admins.includes(pubkey);
  const thisIsHost = pubkey === nostrRoom.info?.host;
  const isSelf = pubkey === login.pubkey;

  const isSpeaker = participant.permissions?.canPublish ?? false;
  const isMuted = !participant.isMicrophoneEnabled;
  const menuItem = (icon: string, text: ReactNode, onClick: () => Promise<void> | void, className?: string) => {
    return (
      <Async onClick={onClick}>
        <div
          className={classNames(
            "flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4 hover:bg-foreground hover:text-primary transition cursor-pointer select-none",
            className,
          )}
        >
          <Icon name={icon} />
          <div>{text}</div>
        </div>
      </Async>
    );
  };
  const isFollowed = isFollowing(pubkey);
  return (
    <div className="absolute z-10 bg-foreground-2 rounded-xl overflow-hidden flex flex-col font-medium w-max">
      {menuItem("eye", <FormattedMessage defaultMessage="View Profile" />, () => {
        nostrRoom.setFlyout(
          <ProfilePageContent link={new NostrLink(NostrPrefix.PublicKey, pubkey)} flyout={true} showEnded={false} />,
        );
      })}
      {!isSelf &&
        menuItem(
          isFollowed ? "user-x" : "user-plus",
          isFollowed ? <FormattedMessage defaultMessage="Unfollow" /> : <FormattedMessage defaultMessage="Follow" />,
          async () => {
            if (isFollowed) {
              await unfollow(pubkey);
            } else {
              await follow(pubkey);
            }
          },
        )}
      {isLoginAdmin && (
        <>
          {menuItem(
            isSpeaker ? "exit" : "enter",
            !isSpeaker ? (
              <FormattedMessage defaultMessage="Add to stage" />
            ) : isSelf ? (
              <FormattedMessage defaultMessage="Leave stage" />
            ) : (
              <FormattedMessage defaultMessage="Remove from stage" />
            ),
            async () => {
              await nostrRoom.api.updatePermissions(room.name, pubkey, { can_publish: !isSpeaker });
            },
          )}
          {!isMuted &&
            menuItem("mic-off", <FormattedMessage defaultMessage="Mute" />, async () => {
              await nostrRoom.api.updatePermissions(room.name, pubkey, { mute_microphone: true });
            })}
          {!thisIsAdmin &&
            !thisIsHost &&
            menuItem("admin", <FormattedMessage defaultMessage="Make admin" />, async () => {
              await nostrRoom.api.updatePermissions(room.name, pubkey, { is_admin: true });
            })}
          {thisIsAdmin &&
            !thisIsHost &&
            menuItem("admin", <FormattedMessage defaultMessage="Remove admin" />, async () => {
              await nostrRoom.api.updatePermissions(room.name, pubkey, { is_admin: false });
            })}
          {!isSelf && !thisIsHost && (
            <>
              <hr className="mx-4 border-foreground" />
              {menuItem(
                "minus-circle",
                <FormattedMessage defaultMessage="Ban user" />,
                () => {},
                "text-delete hover:text-delete",
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
