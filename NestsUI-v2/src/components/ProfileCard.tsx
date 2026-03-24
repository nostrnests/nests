import { useState, useRef, useEffect, useCallback, type PropsWithChildren } from "react";
import {
  UserPlus, UserMinus, Shield, ShieldOff, Ban, Zap,
  ArrowUpFromLine, ArrowDownFromLine, Eye,
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
import { useIsMobile } from "@/hooks/useIsMobile";
import { ZapDialog } from "@/components/ZapDialog";
import { genUserName } from "@/lib/genUserName";
import { getRoomParticipants, getRoomATag } from "@/lib/room";
import type { NostrEvent } from "@nostrify/nostrify";
import type { Event } from "nostr-tools";

interface ProfileCardProps {
  pubkey: string;
  roomEvent: NostrEvent;
}

const HOVER_OPEN_DELAY = 200;
const HOVER_CLOSE_DELAY = 300;

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  // Hover timer refs
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSelf = user?.pubkey === pubkey;
  const following = isFollowing(pubkey);
  const isTargetHost = pubkey === roomEvent.pubkey;

  const currentParticipants = getRoomParticipants(roomEvent);
  const participantEntry = currentParticipants.find((p) => p.pubkey === pubkey);
  const isOnStage = participantEntry?.role === "speaker" || participantEntry?.role === "admin" || isTargetHost;
  const isTargetAdmin = participantEntry?.role === "admin";

  const lightningAddress = metadata?.lud16 ?? metadata?.lud06;

  // Use the author's kind:0 event as zap target so zaps go to this participant
  const authorEvent = author.data?.event as Event | undefined;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handlePointerEnter = useCallback(() => {
    if (isMobile) return;
    clearTimers();
    openTimerRef.current = setTimeout(() => {
      setDropdownOpen(true);
    }, HOVER_OPEN_DELAY);
  }, [isMobile, clearTimers]);

  const handlePointerLeave = useCallback(() => {
    if (isMobile) return;
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, HOVER_CLOSE_DELAY);
  }, [isMobile, clearTimers]);

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
      content: JSON.stringify({ command: "kick", target: targetPubkey }),
      tags: [
        ["a", roomATag],
        ["p", targetPubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
    });

    updateRoomParticipant(targetPubkey, null);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <div
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        </div>
        <DropdownMenuContent
          align="center"
          className="w-56"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
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

          {/* View Profile */}
          <DropdownMenuItem onClick={() => { setProfileOpen(true); setDropdownOpen(false); }}>
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>

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

          {/* Zap - wraps the menu item with ZapDialog */}
          {!isSelf && user && lightningAddress && authorEvent && (
            <ZapDialog target={authorEvent}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Zap className="h-4 w-4 mr-2" />
                Zap
              </DropdownMenuItem>
            </ZapDialog>
          )}

          {/* Admin actions */}
          {isHostOrAdmin && !isSelf && (
            <>
              <DropdownMenuSeparator />

              {/* Stage management */}
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

              {/* Admin role management (only host can promote/demote) */}
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

              {/* Kick (admins can kick non-hosts) */}
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

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Profile</DialogTitle>
            <DialogDescription className="sr-only">
              Profile details for {displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 pt-2">
            {/* Banner area */}
            {metadata?.banner && (
              <div className="w-full h-24 rounded-lg overflow-hidden -mt-2 mb-2">
                <img src={metadata.banner} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-xl bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              {metadata?.nip05 && (
                <p className="text-sm text-muted-foreground">{metadata.nip05}</p>
              )}
            </div>

            {/* About */}
            {metadata?.about && (
              <p className="text-sm text-muted-foreground text-center px-4 leading-relaxed">
                {metadata.about}
              </p>
            )}

            {/* Lightning address */}
            {lightningAddress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="truncate max-w-[200px]">{lightningAddress}</span>
              </div>
            )}

            {/* Follow/Unfollow button inside dialog */}
            {!isSelf && user && (
              <Button
                variant={following ? "outline" : "default"}
                size="sm"
                className="mt-1"
                onClick={() => following ? unfollow(pubkey) : follow(pubkey)}
              >
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
              </Button>
            )}

            {/* Pubkey */}
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
