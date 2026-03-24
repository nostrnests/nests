import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventModifier } from "@/hooks/useEventModifier";
import { getRoomTitle, getRoomSummary, getRoomColor, getRoomImage, getRoomParticipants } from "@/lib/room";
import { ColorPalette } from "@/lib/const";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { NostrEvent } from "@nostrify/nostrify";

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

  const { register, handleSubmit, watch, setValue } = useForm<RoomFormData>({
    defaultValues: {
      title: getRoomTitle(roomEvent),
      summary: getRoomSummary(roomEvent),
      color: getRoomColor(roomEvent),
      image: getRoomImage(roomEvent) ?? "",
    },
  });

  const selectedColor = watch("color");

  const onSubmit = async (data: RoomFormData) => {
    try {
      // Rebuild tags preserving existing ones
      const tags = roomEvent.tags.filter(
        ([t]) => !["title", "summary", "color", "image"].includes(t),
      );

      tags.push(["title", data.title]);
      if (data.summary) tags.push(["summary", data.summary]);
      tags.push(["color", data.color]);
      if (data.image) tags.push(["image", data.image]);

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

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="permissions">
            <div className="flex flex-col gap-4 mt-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Host</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  {roomEvent.pubkey.slice(0, 16)}...
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Admins ({admins.length})</h4>
                {admins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No admins</p>
                ) : (
                  <ul className="space-y-1">
                    {admins.map((a) => (
                      <li key={a.pubkey} className="text-xs text-muted-foreground font-mono">
                        {a.pubkey.slice(0, 16)}...
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Speakers ({speakers.length})</h4>
                {speakers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No designated speakers</p>
                ) : (
                  <ul className="space-y-1">
                    {speakers.map((s) => (
                      <li key={s.pubkey} className="text-xs text-muted-foreground font-mono">
                        {s.pubkey.slice(0, 16)}...
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Use participant menus in the room to manage roles.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
