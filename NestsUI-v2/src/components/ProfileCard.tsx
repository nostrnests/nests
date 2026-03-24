import { type PropsWithChildren } from "react";
import { UserPlus, UserMinus, Shield, ShieldOff, Mic, LogOut, Crown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollowing } from "@/hooks/useFollowing";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useEventModifier } from "@/hooks/useEventModifier";
import { genUserName } from "@/lib/genUserName";
import { getRoomParticipants } from "@/lib/room";
import type { NostrEvent } from "@nostrify/nostrify";

interface ProfileCardProps {
  pubkey: string;
  roomEvent: NostrEvent;
}

export function ProfileCard({ pubkey, roomEvent, children }: PropsWithChildren<ProfileCardProps>) {
  const { user } = useCurrentUser();
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.display_name ?? metadata?.name ?? genUserName(pubkey);
  const { isFollowing, follow, unfollow } = useFollowing();
  const { isHostOrAdmin } = useIsAdmin(roomEvent);
  const { mutate: modifyEvent } = useEventModifier();

  const isSelf = user?.pubkey === pubkey;
  const following = isFollowing(pubkey);

  const currentParticipants = getRoomParticipants(roomEvent);
  const participantEntry = currentParticipants.find((p) => p.pubkey === pubkey);
  const isOnStage = participantEntry?.role === "speaker" || participantEntry?.role === "admin" || pubkey === roomEvent.pubkey;
  const isTargetAdmin = participantEntry?.role === "admin";

  const updateRoomParticipant = (targetPubkey: string, newRole: string | null) => {
    const tags = roomEvent.tags.filter(
      ([t, pk]) => !(t === "p" && pk === targetPubkey),
    );

    if (newRole) {
      tags.push(["p", targetPubkey, "", newRole]);
    }

    modifyEvent({
      kind: roomEvent.kind,
      content: roomEvent.content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        {/* Profile header */}
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="text-xs bg-secondary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{displayName}</p>
            {metadata?.nip05 && (
              <p className="text-xs text-muted-foreground truncate">{metadata.nip05}</p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Follow/Unfollow */}
        {!isSelf && user && (
          <DropdownMenuItem onClick={() => following ? unfollow(pubkey) : follow(pubkey)}>
            {following ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Admin actions */}
        {isHostOrAdmin && !isSelf && (
          <>
            <DropdownMenuSeparator />
            {!isOnStage ? (
              <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, "speaker")}>
                <Mic className="h-4 w-4 mr-2" />
                Add to Stage
              </DropdownMenuItem>
            ) : pubkey !== roomEvent.pubkey ? (
              <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, null)}>
                <LogOut className="h-4 w-4 mr-2" />
                Remove from Stage
              </DropdownMenuItem>
            ) : null}

            {!isTargetAdmin && pubkey !== roomEvent.pubkey ? (
              <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, "admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
            ) : isTargetAdmin ? (
              <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, "speaker")}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Remove Admin
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
