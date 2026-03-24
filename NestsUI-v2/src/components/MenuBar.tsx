import { DoorOpen, Hand, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactionsButton } from "./ReactionsButton";
import { RoomOptionsMenu } from "./RoomOptionsMenu";
import { useRoomContext } from "./RoomContextProvider";
import { useLocalParticipant } from "@/transport";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

export function MenuBar() {
  const { user } = useCurrentUser();
  const { event, roomATag, handRaised, setHandRaised, isSpeaker, leaveRoom } = useRoomContext();
  const { isMicEnabled, isPublishing, setMicEnabled, unpublishMicrophone } = useLocalParticipant();

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        {/* Leave/Exit */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (isPublishing) {
                  unpublishMicrophone();
                }
                leaveRoom();
              }}
            >
              <DoorOpen className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave Room</TooltipContent>
        </Tooltip>

        {/* Leave stage (for speakers) */}
        {isPublishing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => unpublishMicrophone()}
              >
                Leave Stage
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop speaking and join listeners</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Hand raise */}
        {user && !isSpeaker && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10",
                  handRaised && "bg-yellow-500/20 text-yellow-500",
                )}
                onClick={() => setHandRaised(!handRaised)}
              >
                <Hand className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{handRaised ? "Lower Hand" : "Raise Hand"}</TooltipContent>
          </Tooltip>
        )}

        {/* Mute toggle (only for speakers) */}
        {isPublishing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10",
                  !isMicEnabled && "bg-destructive/20 text-destructive",
                )}
                onClick={() => setMicEnabled(!isMicEnabled)}
              >
                {isMicEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
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
