import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Plus, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LoginArea } from "@/components/auth/LoginArea";
import { cn } from "@/lib/utils";

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="h-10 w-10 rounded-xl gradient-1 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-white font-bold text-base">N</span>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Nests</span>
        </Link>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/lobby">
            <Button
              variant="ghost"
              className={cn(
                "rounded-full text-base px-5 h-10",
                isActive("/lobby") && "bg-secondary text-foreground",
              )}
            >
              Rooms
            </Button>
          </Link>
          <Link to="/lobby?tab=following">
            <Button
              variant="ghost"
              className={cn(
                "rounded-full text-base px-5 h-10",
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
                <Button size="icon" variant="ghost" className="rounded-full h-11 w-11">
                  <Plus className="h-6 w-6" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Create Room</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings" className="hidden md:inline-flex">
                <Button size="icon" variant="ghost" className="rounded-full h-11 w-11">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          {/* Login area - always visible on desktop */}
          <LoginArea className="max-w-48 hidden sm:inline-flex" />

          {/* Mobile hamburger */}
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full h-11 w-11 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="flex flex-col px-4 py-3 gap-1">
            <Link
              to="/lobby"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "px-4 py-3 rounded-lg text-base font-medium transition-colors",
                isActive("/lobby") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              Rooms
            </Link>
            <Link
              to="/lobby?tab=following"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "px-4 py-3 rounded-lg text-base font-medium transition-colors",
                location.search.includes("tab=following") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              Following
            </Link>
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              Settings
            </Link>
            <div className="pt-2 border-t border-border/40 mt-1 sm:hidden">
              <LoginArea className="w-full flex" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
