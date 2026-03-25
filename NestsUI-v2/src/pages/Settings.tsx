import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { ArrowLeft, Plus, Trash2, Save, Wifi, Radio } from "lucide-react";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelayListManager } from "@/components/RelayListManager";
import { useMoqServerList } from "@/hooks/useMoqServerList";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { servers, isDirty, addServer, removeServer, save } = useMoqServerList();
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useSeoMeta({
    title: "Settings - Nests",
    description: "Manage your relays and audio servers",
  });

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Tabs defaultValue="relays">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="relays" className="gap-2">
              <Wifi className="h-4 w-4" />
              Relays
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Radio className="h-4 w-4" />
              Audio
            </TabsTrigger>
          </TabsList>

          {/* Relays Tab */}
          <TabsContent value="relays">
            <Card>
              <CardHeader>
                <CardTitle>Nostr Relays</CardTitle>
                <CardDescription>
                  Manage the relays used for reading and publishing Nostr events. Published as a NIP-65 relay list (kind:10002).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RelayListManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audio Servers Tab */}
          <TabsContent value="audio">
            <Card>
              <CardHeader>
                <CardTitle>Audio Servers</CardTitle>
                <CardDescription>
                  MoQ relay servers handle audio transport for rooms you create. Your server list is published as kind:10112.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Server list */}
                <div className="flex flex-col gap-2">
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
                </div>

                {/* Add server */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://moq-relay.example.com"
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

                {/* Save */}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
