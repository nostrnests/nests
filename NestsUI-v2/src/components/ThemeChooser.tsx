import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDittoThemes, useThemeFeed, type DittoThemeEntry } from "@/hooks/useDittoThemes";
import { themePresets } from "@/lib/theme-presets";
import type { DittoTheme } from "@/lib/ditto-theme";
import { cn } from "@/lib/utils";

interface ThemeChooserProps {
  selectedTheme: DittoTheme | null;
  onSelectTheme: (theme: DittoTheme | null, entry?: DittoThemeEntry) => void;
}

function ThemeCard({
  theme,
  label,
  selected,
  onClick,
  authorPubkey,
}: {
  theme: DittoTheme;
  label: string;
  selected: boolean;
  onClick: () => void;
  authorPubkey?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl overflow-hidden transition-all border-2 text-left",
        selected ? "border-ring ring-2 ring-ring/30" : "border-transparent hover:border-border",
      )}
    >
      <div
        className="p-3 h-20 flex flex-col justify-between relative"
        style={{
          backgroundColor: theme.colors.background,
          backgroundImage: theme.background?.url ? `url(${theme.background.url})` : undefined,
          backgroundSize: theme.background?.mode === "tile" ? "auto" : "cover",
          backgroundRepeat: theme.background?.mode === "tile" ? "repeat" : "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {theme.background?.url && (
          <div className="absolute inset-0" style={{ backgroundColor: theme.colors.background, opacity: 0.6 }} />
        )}
        <div className="relative flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: theme.colors.primary }} />
          <span className="text-xs font-medium truncate" style={{ color: theme.colors.text }}>
            {label}
          </span>
        </div>
        <div className="relative flex items-center gap-1">
          <span className="h-2 rounded-full flex-1" style={{ backgroundColor: theme.colors.primary, opacity: 0.7 }} />
          <span className="h-2 rounded-full w-6" style={{ backgroundColor: theme.colors.text, opacity: 0.3 }} />
        </div>
      </div>
    </button>
  );
}

function ThemeGrid({
  entries,
  selectedId,
  onSelect,
}: {
  entries: DittoThemeEntry[];
  selectedId: string | null;
  onSelect: (entry: DittoThemeEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">No themes found</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map((entry) => (
        <ThemeCard
          key={entry.event.id}
          theme={entry.theme}
          label={entry.theme.title || "Untitled"}
          selected={selectedId === entry.event.id}
          onClick={() => onSelect(entry)}
          authorPubkey={entry.event.pubkey}
        />
      ))}
    </div>
  );
}

export function ThemeChooser({ selectedTheme, onSelectTheme }: ThemeChooserProps) {
  const { user } = useCurrentUser();
  const { data: myThemes = [] } = useDittoThemes(user?.pubkey);
  const { data: globalThemes = [] } = useThemeFeed();

  // Track which entry is selected by event ID (for nostr themes)
  const selectedPresetKey = useMemo(() => {
    if (!selectedTheme) return null;
    for (const p of themePresets) {
      if (
        p.theme.colors.background === selectedTheme.colors.background &&
        p.theme.colors.primary === selectedTheme.colors.primary
      ) {
        return p.key;
      }
    }
    return null;
  }, [selectedTheme]);

  const hasMyThemes = myThemes.length > 0;

  return (
    <div className="space-y-2">
      <Tabs defaultValue="presets">
        <TabsList className="w-full grid h-8" style={{ gridTemplateColumns: `repeat(${hasMyThemes ? 3 : 2}, 1fr)` }}>
          <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
          {hasMyThemes && <TabsTrigger value="mine" className="text-xs">My Themes</TabsTrigger>}
          <TabsTrigger value="global" className="text-xs">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="mt-2">
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-2 gap-2 pr-3">
              {/* No theme */}
              <button
                type="button"
                onClick={() => onSelectTheme(null)}
                className={cn(
                  "rounded-xl h-20 flex items-center justify-center transition-all border-2",
                  !selectedTheme ? "border-ring ring-2 ring-ring/30" : "border-transparent hover:border-border",
                  "bg-secondary text-muted-foreground text-sm",
                )}
              >
                Default
              </button>
              {themePresets.map((p) => (
                <ThemeCard
                  key={p.key}
                  theme={p.theme}
                  label={`${p.emoji} ${p.label}`}
                  selected={selectedPresetKey === p.key}
                  onClick={() => onSelectTheme(p.theme)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {hasMyThemes && (
          <TabsContent value="mine" className="mt-2">
            <ScrollArea className="h-[200px]">
              <div className="pr-3">
                <ThemeGrid
                  entries={myThemes}
                  selectedId={null}
                  onSelect={(entry) => onSelectTheme(entry.theme, entry)}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        <TabsContent value="global" className="mt-2">
          <ScrollArea className="h-[200px]">
            <div className="pr-3">
              <ThemeGrid
                entries={globalThemes}
                selectedId={null}
                onSelect={(entry) => onSelectTheme(entry.theme, entry)}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
