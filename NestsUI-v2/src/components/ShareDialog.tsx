import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { buildRoomNaddr, getRoomTitle } from "@/lib/room";
import { useToast } from "@/hooks/useToast";
import type { NostrEvent } from "@nostrify/nostrify";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomEvent: NostrEvent;
}

export function ShareDialog({ open, onOpenChange, roomEvent }: ShareDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const naddr = buildRoomNaddr(roomEvent);
  const title = getRoomTitle(roomEvent);
  const url = `${window.location.origin}/room/${naddr}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBroadcast = () => {
    if (!user) return;
    createEvent(
      {
        kind: 1,
        content: `Join me in "${title}" on Nests!\n\nnostr:${naddr}`,
        tags: [["a", `${roomEvent.kind}:${roomEvent.pubkey}:${roomEvent.tags.find(([t]) => t === "d")?.[1] ?? ""}`]],
        created_at: Math.floor(Date.now() / 1000),
      },
      {
        onSuccess: () => {
          toast({ title: "Shared to Nostr" });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Room</DialogTitle>
          <DialogDescription>Share this room with others</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Copy URL */}
          <div className="flex items-center gap-2">
            <Input value={url} readOnly className="flex-1 bg-secondary/50 border-0" />
            <Button size="icon" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Broadcast to Nostr */}
          {user && (
            <Button
              onClick={handleBroadcast}
              disabled={isPending}
              className="w-full gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share on Nostr
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
