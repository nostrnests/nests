import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Link } from "react-router-dom";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMoqServerList } from "@/hooks/useMoqServerList";
import { ThemeChooser } from "@/components/ThemeChooser";
import { buildRoomNaddr } from "@/lib/room";
import type { DittoTheme } from "@/lib/ditto-theme";
import type { DittoThemeEntry } from "@/hooks/useDittoThemes";
import { ROOM_KIND, DITTO_THEME, ColorPalette, DefaultRelays } from "@/lib/const";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

export default function NewRoom() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent, isPending } = useNostrPublish();
  const { servers } = useMoqServerList();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [color, setColor] = useState(ColorPalette[Math.floor(Math.random() * ColorPalette.length)]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [selectedServer, setSelectedServer] = useState(servers[0] ?? null);
  const [selectedTheme, setSelectedTheme] = useState<DittoTheme | null>(null);
  const [selectedThemeEntry, setSelectedThemeEntry] = useState<DittoThemeEntry | null>(null);

  useSeoMeta({
    title: "Create Room - Nests",
    description: "Create a new audio room on Nests",
  });

  const handleCreate = async () => {
    if (!user || !title.trim()) return;

    try {
      const dTag = uuidv4();
      const isScheduled = !!scheduledTime;
      const startsAt = isScheduled ? Math.floor(new Date(scheduledTime).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const server = selectedServer || servers[0];

      const tags: string[][] = [
        ["d", dTag],
        ["title", title.trim()],
        ["status", isScheduled ? "planned" : "live"],
        ["starts", String(startsAt)],
        ["color", color],
        ["streaming", server.relay],
        ["auth", server.auth],
        ["relays", ...DefaultRelays],
      ];

      if (summary.trim()) {
        tags.push(["summary", summary.trim()]);
      }

      // Add Ditto theme if selected
      if (selectedTheme) {
        // If it came from a nostr event, add an a-tag reference
        if (selectedThemeEntry) {
          const dTag = selectedThemeEntry.event.tags.find(([t]) => t === "d")?.[1] ?? "";
          tags.push(["a", `${DITTO_THEME}:${selectedThemeEntry.event.pubkey}:${dTag}`]);
        }
        // Always add inline color tags (as primary data or fallback)
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

      const event = await createEvent({
        kind: ROOM_KIND,
        content: "",
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      const naddr = buildRoomNaddr(event);
      navigate(`/room/${naddr}`, { state: { event } });
    } catch {
      toast({ title: "Failed to create room", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />

      <main className="mx-auto max-w-lg px-3 md:px-4 py-6 md:py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 md:mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-lg md:text-xl">Create a Room</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:gap-5 px-4 md:px-6">
            {!user && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                You must be logged in to create a room.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Room Name *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's the topic?"
                maxLength={100}
                className="h-11 md:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Description</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Tell people what this room is about..."
                rows={3}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (optional)</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="h-11 md:h-10"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to start the room immediately
              </p>
            </div>

            <div className="space-y-2">
              <Label>Banner Color</Label>
              <div className="flex flex-wrap gap-2">
                {ColorPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-9 w-9 md:h-8 md:w-8 rounded-full transition-all",
                      c,
                      color === c && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                    )}
                  />
                ))}
              </div>

              {/* Preview */}
              <div
                className={cn("rounded-xl p-5 md:p-6 mt-3", !selectedTheme && color)}
                style={selectedTheme ? { backgroundColor: selectedTheme.colors.primary } : undefined}
              >
                <p className="text-white font-semibold text-base md:text-lg">
                  {title || "Room Preview"}
                </p>
                {summary && (
                  <p className="text-white/70 text-sm mt-1">{summary}</p>
                )}
              </div>
            </div>

            {/* Room Theme */}
            <div className="space-y-2">
              <Label>Room Theme</Label>
              <p className="text-xs text-muted-foreground">
                Everyone in the room will see your chosen theme
              </p>
              <ThemeChooser
                selectedTheme={selectedTheme}
                onSelectTheme={(theme, entry) => {
                  setSelectedTheme(theme);
                  setSelectedThemeEntry(entry ?? null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Audio Server</Label>
              <div className="flex flex-col gap-1">
                {servers.map((server) => (
                  <button
                    key={server.relay}
                    type="button"
                    onClick={() => setSelectedServer(server)}
                    className={cn(
                      "text-left text-sm px-3 py-2.5 md:py-2 rounded-lg transition-colors",
                      selectedServer?.relay === server.relay
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {server.relay}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!user || !title.trim() || isPending}
              className="w-full mt-2 h-12 md:h-11 text-base md:text-sm"
              size="lg"
            >
              {isPending ? "Creating..." : scheduledTime ? "Schedule Room" : "Start Room"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
