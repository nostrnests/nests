import { useState } from "react";
import { Share2, Settings, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "./ShareDialog";
import { EditRoomDialog } from "./EditRoomDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Link } from "react-router-dom";
import type { NostrEvent } from "@nostrify/nostrify";

interface RoomOptionsMenuProps {
  roomEvent: NostrEvent;
}

export function RoomOptionsMenu({ roomEvent }: RoomOptionsMenuProps) {
  const { user } = useCurrentUser();
  const { isHostOrAdmin } = useIsAdmin(roomEvent);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12">
            <Settings className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Room
          </DropdownMenuItem>

          {isHostOrAdmin && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Room
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Audio Servers
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        roomEvent={roomEvent}
      />

      {isHostOrAdmin && (
        <EditRoomDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          roomEvent={roomEvent}
        />
      )}
    </>
  );
}
