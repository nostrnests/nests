import { Mic, MicOff, Hand, Crown, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { cn } from "@/lib/utils";

interface ParticipantAvatarProps {
  pubkey: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  handRaised?: boolean;
  role?: string;
  reaction?: string;
  isPublishing?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function ParticipantAvatar({
  pubkey,
  isSpeaking = false,
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

  // Responsive sizes: smaller on mobile, normal on md+
  const sizeClasses = {
    sm: "h-10 w-10 md:h-12 md:w-12",
    md: "h-12 w-12 md:h-16 md:w-16",
    lg: "h-14 w-14 md:h-20 md:w-20",
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-3 w-3 md:h-3.5 md:w-3.5",
    lg: "h-3.5 w-3.5 md:h-4 md:w-4",
  };

  return (
    <div className="flex flex-col items-center gap-1 md:gap-1.5 group" onClick={onClick}>
      <div className="relative">
        {/* Speaking ring */}
        <div
          className={cn(
            "rounded-full p-0.5 transition-all duration-300",
            isSpeaking && isPublishing
              ? "speaking-ring bg-primary"
              : isPublishing
                ? "bg-primary/30"
                : "bg-transparent",
          )}
        >
          <Avatar className={cn(sizeClasses[size], "border-2 border-background cursor-pointer")}>
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="text-[10px] md:text-xs bg-secondary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Mic indicator (only for speakers) */}
        {isPublishing && (
          <div
            className={cn(
              "absolute -bottom-0.5 left-1/2 -translate-x-1/2",
              "rounded-full p-0.5 md:p-1",
              isMuted ? "bg-destructive" : "bg-primary",
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
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 md:p-1">
            <Hand className={cn(iconSize[size], "text-white")} />
          </div>
        )}

        {/* Reaction overlay */}
        {reaction && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 react text-xl md:text-2xl">
            {reaction}
          </div>
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
      <span className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[64px] md:max-w-[80px] text-center">
        {displayName}
      </span>
    </div>
  );
}
