import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, Hand, Crown, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLocalSpeaking, useRemoteSpeaking } from "@/hooks/useSpeakingIndicator";
import { genUserName } from "@/lib/genUserName";
import { isEmoji, getEmojiMaskUrl } from "@/lib/ditto-theme";
import { cn } from "@/lib/utils";

interface ParticipantAvatarProps {
  pubkey: string;
  isMuted?: boolean;
  handRaised?: boolean;
  role?: string;
  reaction?: { emoji: string; emojiUrl?: string };
  isPublishing?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function ParticipantAvatar({
  pubkey,
  isMuted = false,
  handRaised = false,
  role,
  reaction,
  isPublishing = false,
  size = "md",
  onClick,
}: ParticipantAvatarProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.display_name ?? metadata?.name ?? genUserName(pubkey);
  const { user } = useCurrentUser();

  // Avatar shape from kind:0 metadata — renders emoji as mask image
  const avatarMask = useMemo(() => {
    try {
      const parsed = JSON.parse(author.data?.event?.content ?? "{}");
      if (!isEmoji(parsed.shape)) return undefined;
      const url = getEmojiMaskUrl(parsed.shape);
      return url || undefined;
    } catch {
      return undefined;
    }
  }, [author.data?.event?.content]);

  // Speaking detection: local for self, remote for others
  const isMe = user?.pubkey === pubkey;
  const localSpeaking = useLocalSpeaking();
  const remoteSpeaking = useRemoteSpeaking(pubkey);
  const isSpeaking = (isMe ? localSpeaking : remoteSpeaking) && !isMuted;

  // Track avatar position for portal-based reaction
  const avatarRef = useRef<HTMLDivElement>(null);
  const [reactionPos, setReactionPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (reaction && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setReactionPos({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    } else {
      setReactionPos(null);
    }
  }, [reaction]);

  const sizeClasses = {
    sm: "h-12 w-12 md:h-14 md:w-14",
    md: "h-16 w-16 md:h-18 md:w-18",
    lg: "h-[72px] w-[72px] md:h-20 md:w-20",
  };

  const iconSize = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4 md:h-5 md:w-5",
  };

  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2 group" onClick={onClick}>
      <div className="relative" ref={avatarRef}>
        {/* Avatar with optional emoji mask shape */}
        {avatarMask ? (
          <div
            className="transition-all duration-300"
            style={{
              filter: isSpeaking && isPublishing
                ? "drop-shadow(0 0 4px rgb(74 222 128)) drop-shadow(0 0 1px rgb(74 222 128))"
                : isPublishing
                  ? "drop-shadow(3px 0 0 hsl(var(--background))) drop-shadow(-3px 0 0 hsl(var(--background))) drop-shadow(0 3px 0 hsl(var(--background))) drop-shadow(0 -3px 0 hsl(var(--background)))"
                  : "drop-shadow(2px 0 0 hsl(var(--background))) drop-shadow(-2px 0 0 hsl(var(--background))) drop-shadow(0 2px 0 hsl(var(--background))) drop-shadow(0 -2px 0 hsl(var(--background)))",
            }}
          >
            <Avatar
              className={cn(sizeClasses[size], "cursor-pointer")}
              style={{
                WebkitMaskImage: `url(${avatarMask})`,
                maskImage: `url(${avatarMask})`,
                WebkitMaskSize: "cover",
                maskSize: "cover",
                borderRadius: 0,
              }}
            >
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-xs md:text-sm bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-full p-0.5 transition-all duration-300",
              isSpeaking && isPublishing
                ? "ring-2 ring-green-400 ring-offset-2 ring-offset-background"
                : isPublishing
                  ? "ring-1 ring-primary/30 ring-offset-1 ring-offset-background"
                  : "ring-0",
            )}
          >
            <Avatar className={cn(sizeClasses[size], "rounded-full border-2 border-background cursor-pointer")}>
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-xs md:text-sm bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Mic indicator (for speakers) */}
        {isPublishing && (
          <div
            className={cn(
              "absolute -bottom-0.5 left-1/2 -translate-x-1/2",
              "rounded-full p-1",
              isSpeaking ? "bg-green-500" : isMuted ? "bg-destructive" : "bg-primary",
            )}
          >
            {isMuted ? (
              <MicOff className={cn(iconSize[size], "text-white")} />
            ) : (
              <Mic className={cn(iconSize[size], "text-white")} />
            )}
          </div>
        )}

        {/* Hand raised */}
        {handRaised && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 animate-bounce">
            <Hand className={cn(iconSize[size], "text-white")} />
          </div>
        )}

        {/* Reaction rendered via portal so it floats above all containers */}
        {reaction && reactionPos && createPortal(
          <div
            className="fixed z-20 react text-4xl md:text-5xl pointer-events-none"
            style={{
              top: reactionPos.top,
              left: reactionPos.left,
              transform: "translateX(-50%)",
            }}
          >
            {reaction.emojiUrl ? (
              <img src={reaction.emojiUrl} alt={reaction.emoji} className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            ) : (
              reaction.emoji
            )}
          </div>,
          document.body,
        )}

        {/* Role badge */}
        {role === "host" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-1 -left-1 bg-yellow-500 rounded-full p-0.5">
                <Crown className="h-3 w-3 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Host</TooltipContent>
          </Tooltip>
        )}
        {role === "admin" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-1 -left-1 bg-blue-500 rounded-full p-0.5">
                <Shield className="h-3 w-3 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Admin</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Name */}
      <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[80px] md:max-w-[100px] text-center">
        {displayName}
      </span>
    </div>
  );
}
