import { useState, useRef, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { LIVE_CHAT } from "@/lib/const";

interface WriteMessageProps {
  roomATag: string;
}

export function WriteMessage({ roomATag }: WriteMessageProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const [message, setMessage] = useState("");
  const lastSentRef = useRef(0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || !user) return;

    // Rate limit: 1 message per second
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    setMessage(""); // Clear immediately for snappy UX

    createEvent({
      kind: LIVE_CHAT,
      content: text,
      tags: [["a", roomATag]],
      created_at: Math.floor(Date.now() / 1000),
    });
  };

  if (!user) {
    return (
      <div className="p-3 border-t border-border text-center">
        <p className="text-xs md:text-sm text-muted-foreground">
          Log in to send messages
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-2 md:p-3 border-t border-border pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-3"
    >
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Send a message..."
        className="flex-1 bg-secondary/50 border-0 focus-visible:ring-1 h-10 md:h-9 text-sm"
        disabled={isPending}
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="shrink-0 h-10 w-10 md:h-9 md:w-9 rounded-full"
        disabled={!message.trim() || isPending}
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
