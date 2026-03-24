import { useState } from "react";
import { Share2, Settings, Pencil, User, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "./ShareDialog";
import { EditRoomDialog } from "./EditRoomDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ProfileCard } from "./ProfileCard";
import { EditProfileForm } from "./EditProfileForm";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { NostrEvent } from "@nostrify/nostrify";

interface RoomOptionsMenuProps {
  roomEvent: NostrEvent;
}

export function RoomOptionsMenu({ roomEvent }: RoomOptionsMenuProps) {
  const { user } = useCurrentUser();
  const { isHostOrAdmin } = useIsAdmin(roomEvent);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

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

          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>

          {user && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditProfileOpen(true)}>
                <UserPen className="h-4 w-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
            </>
          )}
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

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {user && (
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update your Nostr profile</DialogDescription>
            </DialogHeader>
            <EditProfileForm />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
