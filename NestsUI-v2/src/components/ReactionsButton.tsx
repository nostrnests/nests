import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoomContext } from "./RoomContextProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const REACTIONS = ["🤙", "💯", "😂", "😅", "😳", "🤔", "🔥", "🤡", "🫂", "😱", "🤣", "🤯"];

interface ReactionsButtonProps {
  roomATag: string;
}

export function ReactionsButton({ roomATag }: ReactionsButtonProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { addLocalReaction } = useRoomContext();
  const [open, setOpen] = useState(false);

  const sendReaction = (emoji: string) => {
    if (!user) return;
    // Show immediately via optimistic injection
    addLocalReaction(emoji);
    // Also publish to Nostr for other participants
    createEvent({
      kind: 7,
      content: emoji,
      tags: [["a", roomATag]],
      created_at: Math.floor(Date.now() / 1000),
    });
    setOpen(false);
  };

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" disabled>
            <Smile className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Log in to react</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12">
          <Smile className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="top" align="center">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="h-12 w-12 flex items-center justify-center text-2xl rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
