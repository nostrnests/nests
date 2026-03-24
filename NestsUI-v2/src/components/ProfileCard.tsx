import { useState, type PropsWithChildren } from "react";
import {
  UserPlus, UserMinus, Shield, ShieldOff, Ban, Zap,
  ArrowUpFromLine, ArrowDownFromLine, Eye, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollowing } from "@/hooks/useFollowing";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useEventModifier } from "@/hooks/useEventModifier";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { ZapDialog } from "@/components/ZapDialog";
import { genUserName } from "@/lib/genUserName";
import { getRoomParticipants, getRoomATag } from "@/lib/room";
import type { NostrEvent } from "@nostrify/nostrify";
import type { Event } from "nostr-tools";

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
  const { isHost, isHostOrAdmin } = useIsAdmin(roomEvent);
  const { mutate: modifyEvent } = useEventModifier();
  const { mutate: createEvent } = useNostrPublish();
  const [profileOpen, setProfileOpen] = useState(false);

  const isSelf = user?.pubkey === pubkey;
  const following = isFollowing(pubkey);
  const isTargetHost = pubkey === roomEvent.pubkey;

  const currentParticipants = getRoomParticipants(roomEvent);
  const participantEntry = currentParticipants.find((p) => p.pubkey === pubkey);
  const isOnStage = participantEntry?.role === "speaker" || participantEntry?.role === "admin" || isTargetHost;
  const isTargetAdmin = participantEntry?.role === "admin";

  const lightningAddress = metadata?.lud16 ?? metadata?.lud06;
  const authorEvent = author.data?.event as Event | undefined;

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

  const kickUser = (targetPubkey: string) => {
    const roomATag = getRoomATag(roomEvent);
    createEvent({
      kind: 4312,
      content: "",
      tags: [
        ["a", roomATag],
        ["p", targetPubkey],
        ["action", "kick"],
      ],
      created_at: Math.floor(Date.now() / 1000),
    });
    updateRoomParticipant(targetPubkey, null);
  };

  return (
    <>
      {/* The avatar with a click-triggered dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer">{children}</div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64">
          {/* Profile header inside dropdown */}
          <div className="flex items-center gap-3 p-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-sm bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{displayName}</p>
              {metadata?.nip05 && (
                <p className="text-xs text-muted-foreground truncate">{metadata.nip05}</p>
              )}
              {metadata?.about && (
                <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-0.5">{metadata.about}</p>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* View Full Profile */}
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>

          {/* Follow/Unfollow */}
          {!isSelf && user && (
            <DropdownMenuItem onClick={() => following ? unfollow(pubkey) : follow(pubkey)}>
              {following ? (
                <><UserMinus className="h-4 w-4 mr-2" />Unfollow</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" />Follow</>
              )}
            </DropdownMenuItem>
          )}

          {/* Zap */}
          {!isSelf && user && lightningAddress && authorEvent && (
            <ZapDialog target={authorEvent}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                Zap
              </DropdownMenuItem>
            </ZapDialog>
          )}

          {/* Admin actions */}
          {isHostOrAdmin && !isSelf && (
            <>
              <DropdownMenuSeparator />

              {!isOnStage ? (
                <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, "speaker")}>
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Add to Stage
                </DropdownMenuItem>
              ) : !isTargetHost ? (
                <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, null)}>
                  <ArrowDownFromLine className="h-4 w-4 mr-2" />
                  Remove from Stage
                </DropdownMenuItem>
              ) : null}

              {isHost && !isTargetHost && (
                <>
                  {!isTargetAdmin ? (
                    <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, "admin")}>
                      <Shield className="h-4 w-4 mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => updateRoomParticipant(pubkey, "speaker")}>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Remove Admin
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {!isTargetHost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => kickUser(pubkey)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Kick
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Full Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Profile</DialogTitle>
            <DialogDescription className="sr-only">Profile details for {displayName}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 pt-2">
            {metadata?.banner && (
              <div className="w-full h-28 rounded-lg overflow-hidden -mt-2 mb-2">
                <img src={metadata.banner} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-xl bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              {metadata?.nip05 && (
                <p className="text-sm text-muted-foreground">{metadata.nip05}</p>
              )}
            </div>

            {metadata?.about && (
              <p className="text-sm text-muted-foreground text-center px-4 leading-relaxed">
                {metadata.about}
              </p>
            )}

            {lightningAddress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="truncate max-w-[200px]">{lightningAddress}</span>
              </div>
            )}

            {!isSelf && user && (
              <Button
                variant={following ? "outline" : "default"}
                size="sm"
                className="mt-1"
                onClick={() => following ? unfollow(pubkey) : follow(pubkey)}
              >
                {following ? (
                  <><UserMinus className="h-4 w-4 mr-2" />Unfollow</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Follow</>
                )}
              </Button>
            )}

            <div className="w-full px-4 mt-2">
              <p className="text-[10px] text-muted-foreground/50 font-mono break-all text-center">
                {pubkey}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
