import { DoorOpen, Hand, Mic, MicOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactionsButton } from "./ReactionsButton";
import { RoomOptionsMenu } from "./RoomOptionsMenu";
import { useRoomContext } from "./RoomContextProvider";
import { useLocalParticipant } from "@/transport";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

const ICON_BTN = "rounded-full h-12 w-12";
const ICON_SIZE = "h-6 w-6";

export function MenuBar() {
  const { user } = useCurrentUser();
  const { event, roomATag, handRaised, setHandRaised, isSpeaker, leaveRoom } = useRoomContext();
  const { isMicEnabled, isPublishing, setMicEnabled, unpublishMicrophone } = useLocalParticipant();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-t border-border",
        // Mobile: fixed full-width bar at bottom with safe area
        "fixed bottom-0 left-0 right-0 z-30 bg-background px-4 py-2.5",
        "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
        // Desktop: floating pill centered
        "md:static md:inset-auto md:z-auto",
        "md:mx-auto md:mb-4 md:max-w-md md:w-fit",
        "md:rounded-full md:border md:border-border/50 md:px-5 md:py-2.5",
        "md:bg-background/80 md:backdrop-blur-sm md:shadow-lg md:shadow-black/20",
      )}
    >
      {/* Left group: Leave room + Leave stage */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(ICON_BTN, "text-destructive hover:text-destructive hover:bg-destructive/10")}
              onClick={() => {
                if (isPublishing) unpublishMicrophone();
                leaveRoom();
              }}
            >
              <DoorOpen className={ICON_SIZE} />
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
                className={cn(ICON_BTN, "text-muted-foreground hover:text-foreground")}
                onClick={() => unpublishMicrophone()}
              >
                <LogOut className={ICON_SIZE} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave Stage</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Right group: Hand / Mute / Reactions / Options */}
      <div className="flex items-center gap-1.5">
        {/* Hand raise - visible for listeners */}
        {user && !isSpeaker && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  ICON_BTN,
                  handRaised && "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
                )}
                onClick={() => setHandRaised(!handRaised)}
              >
                <Hand className={ICON_SIZE} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{handRaised ? "Lower Hand" : "Raise Hand"}</TooltipContent>
          </Tooltip>
        )}

        {/* Mute toggle - visible for speakers */}
        {isPublishing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  ICON_BTN,
                  !isMicEnabled && "bg-destructive/20 text-destructive hover:bg-destructive/30",
                )}
                onClick={() => setMicEnabled(!isMicEnabled)}
              >
                {isMicEnabled ? <Mic className={ICON_SIZE} /> : <MicOff className={ICON_SIZE} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMicEnabled ? "Mute" : "Unmute"}</TooltipContent>
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
