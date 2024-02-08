import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder, useUserProfile } from "@snort/system-react";
import Avatar from "../element/avatar";
import DisplayName from "../element/display-name";
import { PrimaryButton } from "../element/button";
import Header from "../element/header";
import { useMemo } from "react";
import { RoomListList } from "./room-list";

export default function ProfilePage({ link, header }: { link: NostrLink; header: boolean }) {
  return (
    <>
      {header && <Header />}
      <div className="lg:w-[35rem] mx-auto">
        <ProfilePageContent link={link} />
      </div>
    </>
  );
}

export function ProfilePageContent({ link }: { link: NostrLink }) {
  const meta = useUserProfile(link.id);
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`rooms:${link.id.slice(0, 12)}`);
    rb.withFilter()
      .kinds([30_312 as EventKind])
      .authors([link.id]);

    return rb;
  }, [link.id]);

  const events = useRequestBuilder(sub);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Avatar pubkey={link.id} size={60} link={false} />
          <h3>
            <DisplayName pubkey={link.id} profile={meta} />
          </h3>
        </div>
        <PrimaryButton>Follow</PrimaryButton>
      </div>
      <p>{meta?.about}</p>
      <hr />
      <RoomListList events={events} showCreateWhenEmpty={false} />
    </div>
  );
}
