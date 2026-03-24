import { useNostr } from "@nostrify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCallback, useState, useEffect } from "react";
import { MOQ_SERVER_LIST, DefaultMoQServers } from "@/lib/const";

/**
 * Manage kind:10112 MoQ server list.
 * Provides CRUD operations and saves by publishing the updated list.
 */
export function useMoqServerList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const [localServers, setLocalServers] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const query = useQuery({
    queryKey: ["nostr", "moq-server-list", user?.pubkey ?? ""],
    queryFn: async () => {
      if (!user) return DefaultMoQServers;

      const events = await nostr.query(
        [{ kinds: [MOQ_SERVER_LIST], authors: [user.pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(3000) },
      );

      if (events.length === 0) return DefaultMoQServers;

      const servers = events[0].tags
        .filter(([t]) => t === "relay" || t === "server")
        .map(([, url]) => url)
        .filter(Boolean);

      return servers.length > 0 ? servers : DefaultMoQServers;
    },
    enabled: !!user,
  });

  // Sync local state with query data
  useEffect(() => {
    if (query.data && !isDirty) {
      setLocalServers(query.data);
    }
  }, [query.data, isDirty]);

  const addServer = useCallback((url: string) => {
    setLocalServers((prev) => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
    setIsDirty(true);
  }, []);

  const removeServer = useCallback((url: string) => {
    setLocalServers((prev) => prev.filter((s) => s !== url));
    setIsDirty(true);
  }, []);

  const reorderServers = useCallback((servers: string[]) => {
    setLocalServers(servers);
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!user) return;

    const tags = localServers.map((url) => ["server", url]);

    await createEvent({
      kind: MOQ_SERVER_LIST,
      content: "",
      tags,
      created_at: Math.floor(Date.now() / 1000),
    });

    setIsDirty(false);
    queryClient.invalidateQueries({ queryKey: ["nostr", "moq-server-list"] });
  }, [user, localServers, createEvent, queryClient]);

  return {
    servers: localServers.length > 0 ? localServers : (query.data ?? DefaultMoQServers),
    isLoading: query.isLoading,
    isDirty,
    addServer,
    removeServer,
    reorderServers,
    save,
  };
}
