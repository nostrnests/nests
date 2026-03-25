import { useState } from "react";
import { useForm } from "react-hook-form";
import { X, Crown, Shield, Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventModifier } from "@/hooks/useEventModifier";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthor } from "@/hooks/useAuthor";
import { useMoqServerList } from "@/hooks/useMoqServerList";
import { ThemeChooser } from "@/components/ThemeChooser";
import { getRoomTitle, getRoomSummary, getRoomColor, getRoomImage, getRoomParticipants } from "@/lib/room";
import { parseThemeTags, type DittoTheme } from "@/lib/ditto-theme";
import { genUserName } from "@/lib/genUserName";
import type { DittoThemeEntry } from "@/hooks/useDittoThemes";
import { ColorPalette, DITTO_THEME } from "@/lib/const";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { NostrEvent } from "@nostrify/nostrify";

/** Row showing a participant's avatar, name, role badge, and optional remove button. */
function ParticipantRow({
  pubkey,
  role,
  isHost,
  onRemove,
}: {
  pubkey: string;
  role: string;
  isHost?: boolean;
  onRemove?: () => void;
}) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.display_name ?? metadata?.name ?? genUserName(pubkey);

  const roleIcon = {
    host: <Crown className="h-3.5 w-3.5 text-yellow-500" />,
    admin: <Shield className="h-3.5 w-3.5 text-blue-500" />,
    speaker: <Mic className="h-3.5 w-3.5 text-green-500" />,
  }[role];

  const roleLabel = {
    host: "Host",
    admin: "Admin",
    speaker: "Speaker",
  }[role] ?? role;

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-xs bg-secondary">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {roleIcon}
          <span>{roleLabel}</span>
        </div>
      </div>
      {onRemove && !isHost && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface EditRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomEvent: NostrEvent;
}

interface RoomFormData {
  title: string;
  summary: string;
  color: string;
  image: string;
}

export function EditRoomDialog({ open, onOpenChange, roomEvent }: EditRoomDialogProps) {
  const { mutateAsync: modifyEvent, isPending } = useEventModifier();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { servers } = useMoqServerList();

  // Parse existing inline theme from room event
  const existingTheme = parseThemeTags(roomEvent.tags);
  const [selectedTheme, setSelectedTheme] = useState<DittoTheme | null>(existingTheme);
  const [selectedThemeEntry, setSelectedThemeEntry] = useState<DittoThemeEntry | null>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<RoomFormData>({
    values: {
      title: getRoomTitle(roomEvent),
      summary: getRoomSummary(roomEvent),
      color: getRoomColor(roomEvent),
      image: getRoomImage(roomEvent) ?? "",
    },
  });

  const selectedColor = watch("color");

  const onSubmit = async (data: RoomFormData) => {
    try {
      // Rebuild tags preserving existing ones, stripping editable fields + theme + server tags
      const tags = roomEvent.tags.filter(
        ([t, v]) =>
          !["title", "summary", "color", "image", "c", "f", "bg", "streaming", "auth"].includes(t) &&
          !(t === "a" && v?.startsWith(`${DITTO_THEME}:`)),
      );

      tags.push(["title", data.title]);
      if (data.summary) tags.push(["summary", data.summary]);
      tags.push(["color", data.color]);
      if (data.image) tags.push(["image", data.image]);

      // Re-add streaming + auth from user's current server list
      const server = servers[0];
      if (server) {
        tags.push(["streaming", server.relay]);
        tags.push(["auth", server.auth]);
      }

      // Add theme tags if a theme is selected
      if (selectedTheme) {
        if (selectedThemeEntry) {
          const dTag = selectedThemeEntry.event.tags.find(([t]) => t === "d")?.[1] ?? "";
          tags.push(["a", `${DITTO_THEME}:${selectedThemeEntry.event.pubkey}:${dTag}`]);
        }
        tags.push(["c", selectedTheme.colors.background, "background"]);
        tags.push(["c", selectedTheme.colors.text, "text"]);
        tags.push(["c", selectedTheme.colors.primary, "primary"]);
        if (selectedTheme.font) {
          const fontTag = ["f", selectedTheme.font.family];
          if (selectedTheme.font.url) fontTag.push(selectedTheme.font.url);
          tags.push(fontTag);
        }
        if (selectedTheme.background) {
          tags.push(["bg", `url ${selectedTheme.background.url}`, `mode ${selectedTheme.background.mode}`]);
        }
      }

      await modifyEvent({
        kind: roomEvent.kind,
        content: roomEvent.content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      toast({ title: "Room updated" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to update room", variant: "destructive" });
    }
  };

  const removeParticipant = async (pubkey: string) => {
    try {
      const tags = roomEvent.tags.filter(
        ([t, pk]) => !(t === "p" && pk === pubkey),
      );
      await modifyEvent({
        kind: roomEvent.kind,
        content: roomEvent.content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });
      toast({ title: "Participant removed" });
    } catch {
      toast({ title: "Failed to remove participant", variant: "destructive" });
    }
  };

  const participants = getRoomParticipants(roomEvent);
  const admins = participants.filter((p) => p.role === "admin");
  const speakers = participants.filter((p) => p.role === "speaker");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>Update room details and permissions</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="permissions" className="flex-1">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Room Name</Label>
                <Input id="title" {...register("title", { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Description</Label>
                <Textarea id="summary" {...register("summary")} rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Banner Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ColorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue("color", color)}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all",
                        color,
                        selectedColor === color && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Banner Image URL</Label>
                <Input id="image" {...register("image")} placeholder="https://..." />
              </div>

              {/* Room Theme */}
              <div className="space-y-2">
                <Label>Room Theme</Label>
                <ThemeChooser
                  selectedTheme={selectedTheme}
                  onSelectTheme={(theme, entry) => {
                    setSelectedTheme(theme);
                    setSelectedThemeEntry(entry ?? null);
                  }}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="permissions">
            <div className="flex flex-col gap-4 mt-4">
              {/* Host */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Host</h4>
                <ParticipantRow pubkey={roomEvent.pubkey} role="host" isHost />
              </div>

              {/* Admins */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Admins {admins.length > 0 && `(${admins.length})`}
                </h4>
                {admins.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No admins</p>
                ) : (
                  <div className="divide-y divide-border">
                    {admins.map((a) => (
                      <ParticipantRow
                        key={a.pubkey}
                        pubkey={a.pubkey}
                        role="admin"
                        onRemove={() => removeParticipant(a.pubkey)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Speakers */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Speakers {speakers.length > 0 && `(${speakers.length})`}
                </h4>
                {speakers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No designated speakers</p>
                ) : (
                  <div className="divide-y divide-border">
                    {speakers.map((s) => (
                      <ParticipantRow
                        key={s.pubkey}
                        pubkey={s.pubkey}
                        role="speaker"
                        onRemove={() => removeParticipant(s.pubkey)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
