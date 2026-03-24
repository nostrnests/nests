import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RoomCard } from "./RoomCard";
import { useRoomList } from "@/hooks/useRoomList";
import { useRoomContext } from "./RoomContextProvider";

export function RoomLobbyDrawer() {
  const { lobbyDrawerOpen, setLobbyDrawerOpen, event } = useRoomContext();
  const { data } = useRoomList();

  const otherRooms = data?.live.filter((r) => r.id !== event.id) ?? [];

  return (
    <Sheet open={lobbyDrawerOpen} onOpenChange={setLobbyDrawerOpen}>
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>Other Rooms</SheetTitle>
          <SheetDescription>Browse other active rooms</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 mt-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {otherRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No other rooms are live right now
            </p>
          ) : (
            otherRooms.map((room) => (
              <RoomCard key={room.id} event={room} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
