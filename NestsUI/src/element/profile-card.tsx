import Icon from "../icon";
import { ReactNode } from "react";
import classNames from "classnames";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { ProfilePageContent } from "../pages/profile";
import { EventBuilder, NostrLink } from "@snort/system";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useLogin } from "../login";
import { FormattedMessage } from "react-intl";
import useFollowing from "../hooks/useFollowing";
import Async from "./async";
import useEventBuilder from "../hooks/useEventBuilder";
import useEventModifier from "../hooks/useEventModifier";
import { ADMIN_COMMAND, ParticipantRole } from "../const";

export default function ProfileCard({ pubkey }: { pubkey: string }) {
  const login = useLogin();
  const nostrRoom = useNostrRoom();
  const isLoginAdmin = useIsAdmin();
  const { isFollowing, follow, unfollow } = useFollowing();
  const { system, signer } = useEventBuilder();
  const modifier = useEventModifier();

  const event = nostrRoom.event;
  const thisIsHost = pubkey === event.pubkey;
  const thisIsAdmin = event.tags.some(
    (t) => t[0] === "p" && t[1] === pubkey && t[3] === ParticipantRole.ADMIN,
  );
  const isSelf = pubkey === login.pubkey;

  const isSpeaker = event.tags.some(
    (t) =>
      t[0] === "p" &&
      t[1] === pubkey &&
      (t[3] === ParticipantRole.SPEAKER || t[3] === ParticipantRole.ADMIN),
  ) || thisIsHost;

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

  /**
   * Update the room event to add/remove/change a participant's role.
   */
  async function updateParticipantRole(targetPubkey: string, role: string | null) {
    const updatedEvent = { ...event };
    // Remove existing p tag for this pubkey
    updatedEvent.tags = updatedEvent.tags.filter(
      (t) => !(t[0] === "p" && t[1] === targetPubkey),
    );
    // Add new p tag with role if role is not null
    if (role) {
      updatedEvent.tags.push(["p", targetPubkey, "", role]);
    }
    await modifier.update(updatedEvent);
  }

  return (
    <div className="absolute z-10 bg-foreground-2 rounded-xl overflow-hidden flex flex-col font-medium w-max">
      {menuItem("eye", <FormattedMessage defaultMessage="View Profile" />, () => {
        nostrRoom.setFlyout(<ProfilePageContent link={NostrLink.publicKey(pubkey)} flyout={true} showEnded={false} />);
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
              await updateParticipantRole(
                pubkey,
                isSpeaker ? null : ParticipantRole.SPEAKER,
              );
            },
          )}
          {!thisIsAdmin &&
            !thisIsHost &&
            menuItem("admin", <FormattedMessage defaultMessage="Make admin" />, async () => {
              await updateParticipantRole(pubkey, ParticipantRole.ADMIN);
            })}
          {thisIsAdmin &&
            !thisIsHost &&
            menuItem("admin", <FormattedMessage defaultMessage="Remove admin" />, async () => {
              await updateParticipantRole(pubkey, ParticipantRole.SPEAKER);
            })}
          {!isSelf && !thisIsHost && (
            <>
              <hr className="mx-4 border-foreground" />
              {menuItem(
                "minus-circle",
                <FormattedMessage defaultMessage="Kick user" />,
                async () => {
                  if (!signer) return;
                  // Send kick admin command (kind:4312)
                  const roomLink = NostrLink.fromEvent(event);
                  const eb = new EventBuilder();
                  eb.kind(ADMIN_COMMAND)
                    .tag(roomLink.toEventTag()!)
                    .tag(["p", pubkey])
                    .tag(["action", "kick"]);
                  const ev = await eb.buildAndSign(signer);
                  await system.BroadcastEvent(ev);
                  // Also remove from stage if they're a speaker
                  await updateParticipantRole(pubkey, null);
                },
                "text-delete hover:text-delete",
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
