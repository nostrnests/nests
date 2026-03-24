import { DoorOpen, Hand, Mic, MicOff, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactionsButton } from "./ReactionsButton";
import { RoomOptionsMenu } from "./RoomOptionsMenu";
import { useRoomContext } from "./RoomContextProvider";
import { useLocalParticipant } from "@/transport";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

// Consistent large button sizes for easy tapping
const BTN = "rounded-full h-14 w-14";
const ICON = "h-7 w-7";

interface MenuBarProps {
  onChatToggle?: () => void;
  chatOpen?: boolean;
}

export function MenuBar({ onChatToggle, chatOpen }: MenuBarProps) {
  const { user } = useCurrentUser();
  const { event, roomATag, handRaised, setHandRaised, isSpeaker, leaveRoom } = useRoomContext();
  const { isMicEnabled, isPublishing, setMicEnabled, unpublishMicrophone, declinedPublish } = useLocalParticipant();

  // Hand raise is always available for any logged-in user
  const showHandRaise = !!user;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1",
        // Mobile: fixed full-width bar at bottom
        "fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border px-3 py-2",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        // Desktop: floating pill centered
        "md:static md:inset-auto md:z-auto",
        "md:mx-auto md:mb-4 md:max-w-lg md:w-fit",
        "md:rounded-full md:border md:border-border/50 md:px-4 md:py-2",
        "md:bg-background/80 md:backdrop-blur-sm md:shadow-lg md:shadow-black/20",
      )}
    >
      {/* Left: Leave room + Leave stage */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(BTN, "text-destructive hover:text-destructive hover:bg-destructive/10")}
              onClick={() => {
                if (isPublishing) unpublishMicrophone();
                leaveRoom();
              }}
            >
              <DoorOpen className={ICON} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave Room</TooltipContent>
        </Tooltip>

        {isPublishing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(BTN, "text-muted-foreground hover:text-foreground")}
                onClick={() => unpublishMicrophone()}
              >
                <LogOut className={ICON} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave Stage</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Center + Right: Hand / Mute / Chat / Reactions / Options */}
      <div className="flex items-center gap-1">
        {/* Hand raise */}
        {showHandRaise && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  BTN,
                  handRaised && "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
                )}
                onClick={() => setHandRaised(!handRaised)}
              >
                <Hand className={ICON} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{handRaised ? "Lower Hand" : "Raise Hand"}</TooltipContent>
          </Tooltip>
        )}

        {/* Mute toggle */}
        {isPublishing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  BTN,
                  !isMicEnabled && "bg-destructive/20 text-destructive hover:bg-destructive/30",
                )}
                onClick={() => setMicEnabled(!isMicEnabled)}
              >
                {isMicEnabled ? <Mic className={ICON} /> : <MicOff className={ICON} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMicEnabled ? "Mute" : "Unmute"}</TooltipContent>
          </Tooltip>
        )}

        {/* Chat toggle */}
        {onChatToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(BTN, chatOpen && "bg-primary/20 text-primary")}
                onClick={onChatToggle}
              >
                <MessageCircle className={ICON} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{chatOpen ? "Hide Chat" : "Show Chat"}</TooltipContent>
          </Tooltip>
        )}

        {/* Reactions */}
        <ReactionsButton roomATag={roomATag} />

        {/* Options */}
        <RoomOptionsMenu roomEvent={event} />
      </div>
    </div>
  );
}
