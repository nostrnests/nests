import { useState } from "react";
import { Plus, Trash2, Save, Wifi, Radio } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelayListManager } from "@/components/RelayListManager";
import { useMoqServerList } from "@/hooks/useMoqServerList";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useCurrentUser();
  const { servers, isDirty, addServer, removeServer, save } = useMoqServerList();
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddServer = () => {
    const url = newUrl.trim();
    if (!url) return;
    try {
      new URL(url);
      addServer(url);
      setNewUrl("");
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save();
      toast({ title: "Server list saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your relays and audio servers</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="relays">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="relays" className="gap-2">
              <Wifi className="h-4 w-4" />
              Relays
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Radio className="h-4 w-4" />
              Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="relays" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Relays used for reading and publishing Nostr events. Published as NIP-65 (kind:10002).
            </p>
            <RelayListManager />
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              MoQ relay servers handle audio transport for rooms you create. Published as kind:10112.
            </p>
            <div className="flex flex-col gap-3">
              {servers.map((server) => (
                <div
                  key={server.relay}
                  className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                >
                  <Radio className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{server.relay}</span>
                    <span className="text-xs text-muted-foreground truncate block">{server.auth}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeServer(server.relay)}
                    disabled={servers.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://moq.example.com:4443"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddServer()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddServer}
                  disabled={!newUrl.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {user && (
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Server List"}
                </Button>
              )}

              {!user && (
                <p className="text-sm text-muted-foreground text-center">
                  Log in to save your server list to Nostr
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
