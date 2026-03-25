import { useSeoMeta } from "@unhead/react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { RoomCard } from "@/components/RoomCard";
import { useRoomList } from "@/hooks/useRoomList";
import { useFollowing } from "@/hooks/useFollowing";
import { useMuteList } from "@/hooks/useMuteList";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function RoomGrid({ rooms, isLoading }: { rooms: import("@nostrify/nostrify").NostrEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] md:h-[160px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 md:py-16">
        <p className="text-muted-foreground">No rooms found</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Check back later or create your own room
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {rooms.map((event) => (
        <RoomCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export default function Lobby() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "browse";
  const { data, isLoading } = useRoomList();
  const { contacts } = useFollowing();
  const { mutedPubkeys } = useMuteList();

  useSeoMeta({
    title: "Nests - Audio Rooms on Nostr",
    description: "Join live audio rooms on Nostr. Listen, speak, and connect with communities in real-time.",
  });

  // Filter out rooms hosted by muted users
  const liveRooms = (data?.live ?? []).filter((room) => !mutedPubkeys.includes(room.pubkey));
  const plannedRooms = (data?.planned ?? []).filter((room) => !mutedPubkeys.includes(room.pubkey));

  const followingRooms = liveRooms.filter((room) =>
    contacts.includes(room.pubkey) ||
    room.tags
      .filter(([t]) => t === "p")
      .some(([, pk]) => contacts.includes(pk)),
  );

  const handleTabChange = (value: string) => {
    if (value === "browse") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-3 md:px-4 py-4 md:py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <TabsList>
              <TabsTrigger value="browse" className="text-xs md:text-sm">Browse Rooms</TabsTrigger>
              <TabsTrigger value="following" className="text-xs md:text-sm">Following</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="space-y-6 md:space-y-8">
            {/* Live rooms */}
            <section>
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </h2>
              <RoomGrid rooms={liveRooms} isLoading={isLoading} />
            </section>

            {/* Planned rooms */}
            {plannedRooms.length > 0 && (
              <section>
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Upcoming</h2>
                <RoomGrid rooms={plannedRooms} isLoading={false} />
              </section>
            )}
          </TabsContent>

          <TabsContent value="following">
            <section>
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Rooms from people you follow</h2>
              <RoomGrid rooms={followingRooms} isLoading={isLoading} />
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
