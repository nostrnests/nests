import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoomContext } from "./RoomContextProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const EMOJI_CATEGORIES = {
  favorites: { label: "Favorites", icon: "⭐", emojis: ["🤙", "💯", "🔥", "💜", "❤️", "👏", "🙌", "✨"] },
  faces: { label: "Faces", icon: "😂", emojis: ["😂", "🤣", "😅", "😳", "🤔", "😱", "🤯", "😍", "🥺", "😤", "🫠", "💀"] },
  hands: { label: "Hands", icon: "👋", emojis: ["👋", "🤝", "👊", "✌️", "🤘", "🫡", "🙏", "👆"] },
  symbols: { label: "Symbols", icon: "⚡", emojis: ["⚡", "💎", "🏆", "🎯", "🚀", "💰", "🎉", "🎵"] },
} as const;

type CategoryKey = keyof typeof EMOJI_CATEGORIES;

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
    addLocalReaction(emoji);
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
      <PopoverContent className="w-80 p-3" side="top" align="center">
        <Tabs defaultValue="favorites">
          <TabsList className="w-full grid grid-cols-4 h-9 mb-2">
            {(Object.keys(EMOJI_CATEGORIES) as CategoryKey[]).map((key) => (
              <TabsTrigger key={key} value={key} className="text-base px-1 py-1">
                {EMOJI_CATEGORIES[key].icon}
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(EMOJI_CATEGORIES) as CategoryKey[]).map((key) => (
            <TabsContent key={key} value={key} className="mt-0">
              <div className="grid grid-cols-4 gap-1">
                {EMOJI_CATEGORIES[key].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="h-14 w-full flex items-center justify-center text-3xl rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
