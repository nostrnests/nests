import { Link, useLocation } from "react-router-dom";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LoginArea } from "@/components/auth/LoginArea";
import { cn } from "@/lib/utils";

export function Header() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg gradient-1 flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg tracking-tight hidden sm:block">Nests</span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full text-sm",
                isActive("/") && "bg-secondary text-foreground",
              )}
            >
              Rooms
            </Button>
          </Link>
          <Link to="/?tab=following">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full text-sm",
                location.search.includes("tab=following") && "bg-secondary text-foreground",
              )}
            >
              Following
            </Button>
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/new">
                <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                  <Plus className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Create Room</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings">
                <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          <LoginArea className="max-w-48" />
        </div>
      </div>
    </header>
  );
}
