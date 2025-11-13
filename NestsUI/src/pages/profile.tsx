import { NostrLink, RequestBuilder } from "@snort/system";
import { SnortContext, useRequestBuilder, useUserProfile } from "@snort/system-react";
import Avatar from "../element/avatar";
import DisplayName from "../element/display-name";
import Button, { PrimaryButton } from "../element/button";
import Header from "../element/header";
import { useContext, useMemo } from "react";
import { RoomListList } from "../element/room-list-list";
import { DefaultRelays, ROOM_KIND } from "../const";
import { FormattedMessage } from "react-intl";
import { logout, useLogin } from "../login";
import { useNavigate } from "react-router-dom";
import FollowButton from "../element/follow-button";
import { updateRelays } from "../utils";
import Icon from "../icon";
import ZapButton from "../element/zap-button";
import { AvatarStack } from "../element/avatar-stack";
import Mention from "../element/mention";
import Text from "../element/text";

export default function ProfilePage({ link, header }: { link: NostrLink; header: boolean }) {
  updateRelays(DefaultRelays);
  return (
    <>
      {header && <Header />}
      <div className="lg:w-140 mx-auto max-lg:px-4">
        <ProfilePageContent link={link} flyout={false} showEnded={true} />
      </div>
    </>
  );
}

export function ProfilePageContent({
  link,
  flyout,
  showEnded,
}: {
  link: NostrLink;
  flyout: boolean;
  showEnded: boolean;
}) {
  const meta = useUserProfile(link.id);
  const navigate = useNavigate();
  const login = useLogin();
  const system = useContext(SnortContext);
  const isMe = login.pubkey === link.id;
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`rooms:${link.id.slice(0, 12)}`);
    rb.withFilter().kinds([ROOM_KIND]).authors([link.id]);

    return rb;
  }, [link.id]);

  const events = useRequestBuilder(sub);

  const followedBy = isMe ? undefined : system.config.socialGraphInstance.followedByFriends(link.id);
  return (
    <div className="flex flex-col gap-4">
      <div className={flyout ? "flex flex-col gap-2" : "flex justify-between"}>
        <div className="flex items-center gap-4">
          <Avatar pubkey={link.id} size={60} link={false} />
          <h3>
            <DisplayName pubkey={link.id} profile={meta} />
          </h3>
        </div>
        <div className="flex gap-2 items-center">
          {login.type !== "none" && (
            <div>
              {login.pubkey === link.id ? (
                <PrimaryButton
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  <FormattedMessage defaultMessage="Logout" />
                </PrimaryButton>
              ) : (
                <FollowButton pubkey={link.id} />
              )}
            </div>
          )}
          {meta?.lud16 && <ZapButton pubkey={link.id} iconSize={30} />}
          <Button className="bg-delete rounded-full">
            <div className="flex gap-2 items-center">
              <Icon name="minus-circle" />
              <FormattedMessage defaultMessage="Block" />
            </div>
          </Button>
        </div>
      </div>
      {followedBy && (followedBy?.size ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <AvatarStack>
            {[...followedBy].slice(0, 3).map((a) => (
              <Avatar pubkey={a} link={false} />
            ))}
          </AvatarStack>
          <div>
            <FormattedMessage
              defaultMessage="Followed by {names}"
              values={{
                names: (
                  <>
                    {[...followedBy].slice(0, 3).map((a, i) => (
                      <>
                        <Mention link={NostrLink.publicKey(a)} />
                        {i < Math.min(2, followedBy.size - 1) && ","}{" "}
                      </>
                    ))}
                  </>
                ),
              }}
            />
            {followedBy.size > 3 && (
              <FormattedMessage
                defaultMessage=" & {n} others"
                values={{
                  n: followedBy.size - 3,
                }}
              />
            )}
          </div>
        </div>
      )}
      {meta?.nip05 && <p className="text-highlight text-sm">{meta.nip05}</p>}
      {meta?.about && <Text content={meta?.about} tags={[]} />}
      <hr />
      <RoomListList events={events} showCreateWhenEmpty={false} showEmptyRooms={true} showEnded={showEnded} />
    </div>
  );
}
