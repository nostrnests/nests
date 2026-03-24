# Nests: Migration to MKStack + Nostrify

> Status: PLAN - Awaiting approval before implementation

## Decision Summary

- **Approach**: Clean rewrite from mkstack template
- **i18n**: Drop react-intl, use plain strings (can add i18n later)
- **UI**: Rebuild with shadcn/ui components
- **Wallet/Zaps**: Rewrite using NIP-47 (NWC) + WebLN directly (mkstack already has this)
- **PWA**: Add manifest + service worker to mkstack (template has the HTML plumbing)
- **Transport**: Port existing MoQ transport, rewrite auth helper for Nostrify signer
- **WASM optimizer**: Drop (Nostrify doesn't use Snort's filter expansion)

---

## Scope Assessment

### What we're replacing

| Current (Snort + custom) | New (MKStack + Nostrify) |
|---|---|
| `@snort/system` (36 files) | `@nostrify/nostrify` + `@nostrify/react` |
| `@snort/system-react` (18 files) | `@nostrify/react` + TanStack Query |
| `@snort/shared` (16 files) | `nostr-tools` + native JS |
| `@snort/wallet` (3 files) | `@getalby/sdk` + WebLN (already in mkstack) |
| `@snort/worker-relay` + `@snort/system-wasm` | Drop entirely |
| react-intl (35 files) | Plain strings |
| Custom login.ts (625 lines) | `@nostrify/react/login` (~50 lines) |
| Custom ExternalStore pattern | TanStack Query |
| Hand-built UI components | shadcn/ui (53 components included) |
| react-router-dom v7 createBrowserRouter | react-router-dom v6 BrowserRouter |

### What we're keeping (porting directly)

| Module | Changes needed |
|---|---|
| `transport/moq-transport.ts` (490 lines) | No Snort imports, port as-is |
| `transport/types.ts` (118 lines) | No changes |
| `transport/hooks.ts` (128 lines) | No changes |
| `transport/provider.tsx` (66 lines) | No changes |
| `transport/auth.ts` (48 lines) | Replace EventBuilder + EventSigner with Nostrify signer |
| `moq-auth/` service | No changes |
| `nests-relay/` operator package | No changes |
| `dev-config/` scripts | No changes |

### What we're rewriting

| Current file(s) | Lines | New approach |
|---|---|---|
| `login.ts` (625 lines) | 625 | `@nostrify/react/login` + `useLoginActions` (~50 lines) |
| `main.tsx` (156 lines) | 156 | mkstack `App.tsx` pattern (~30 lines) |
| `room.tsx` (249 lines) | 249 | Nostrify queries + transport provider |
| `new-room.tsx` (187 lines) | 187 | `useNostrPublish` + react-hook-form |
| `room-list.tsx` + `room-list-list.tsx` (254 lines) | 254 | TanStack Query subscriptions |
| `participants.tsx` (246 lines) | 246 | shadcn/ui + transport hooks |
| `chat-messages.tsx` (389 lines) | 389 | shadcn/ui + TanStack Query |
| `write-message.tsx` (225 lines) | 225 | shadcn/ui + `useNostrPublish` |
| `login.tsx` (398 lines) | 398 | mkstack LoginDialog already exists |
| `profile-editor.tsx` (305 lines) | 305 | mkstack EditProfileForm already exists |
| `edit-room.tsx` (197 lines) | 197 | shadcn/ui Dialog + react-hook-form |
| `zap-modal.tsx` (126 lines) | 126 | mkstack ZapDialog already exists |
| `wallet.tsx` (180 lines) | 180 | mkstack NWCContext + WalletModal |
| 16 Snort-dependent hooks | ~900 | Nostrify + TanStack Query equivalents |

---

## Architecture Mapping

### Snort → Nostrify Equivalents

| Snort Concept | Nostrify Equivalent |
|---|---|
| `NostrSystem` + `ConnectToRelay()` | `NPool` with relay routing functions |
| `RequestBuilder` + `useRequestBuilder` | `nostr.query(filters)` via TanStack `useQuery` |
| `EventBuilder` + `buildAndSign(signer)` | `signer.signEvent({ kind, content, tags, created_at })` |
| `system.BroadcastEvent(ev)` | `nostr.event(ev)` |
| `EventPublisher` | `useNostrPublish()` hook (TanStack mutation) |
| `useUserProfile(pubkey)` | `useAuthor(pubkey)` (TanStack query for kind:0) |
| `useEventFeed(link)` | `useQuery` with `nostr.query([filter])` |
| `NostrLink.fromEvent(ev)` | `nip19.naddrEncode(...)` from nostr-tools |
| `parseNostrLink(str)` | `nip19.decode(str)` from nostr-tools |
| `ExternalStore` + `useSyncExternalStore` | TanStack Query + React state |
| `Nip7Signer` | `NUser.fromExtension()` |
| `Nip46Signer` | `NUser.fromBunkerLogin()` |
| `PrivateKeySigner` | `NUser.fromNsec()` |
| `EventKind` enum | Plain numbers (1, 0, 30312, etc.) |
| `sanitizeRelayUrl()` | `NRelay1` handles normalization |
| `unixNow()` | `Math.floor(Date.now() / 1000)` |
| `hexToBech32()` | `nip19.npubEncode()` from nostr-tools |
| `bech32ToHex()` | `nip19.decode()` from nostr-tools |

### Event Kind Constants

```typescript
// const.ts (new)
export const ROOM_KIND = 30312;
export const ROOM_PRESENCE = 10312;
export const LIVE_CHAT = 1311;
export const MOQ_SERVER_LIST = 10112;
export const ADMIN_COMMAND = 4312;
```

### Transport Auth Rewrite

Current (Snort):
```typescript
import { EventBuilder, EventKind, type EventSigner } from "@snort/system";
const builder = new EventBuilder();
builder.tag(["u", url]).tag(["method", "POST"]).kind(EventKind.HttpAuthentication);
const ev = JSON.stringify(await builder.buildAndSign(signer));
```

New (Nostrify):
```typescript
import type { NostrSigner } from "@nostrify/nostrify";
const event = await signer.signEvent({
  kind: 27235,
  content: "",
  tags: [["u", url], ["method", "POST"]],
  created_at: Math.floor(Date.now() / 1000),
});
const ev = JSON.stringify(event);
```

---

## Implementation Phases

### Phase 1: Scaffold & Core Infrastructure [~2 days]

1. **Initialize mkstack template**
   - Clone mkstack to `NestsUI-v2/` (or replace `NestsUI/`)
   - Configure `package.json` name, add MoQ dependencies
   - Set up Tailwind theme to match current Nests dark theme
   - Add custom color tokens (foreground, foreground-2, primary, delete, etc.)

2. **Configure providers**
   - Update `AppProvider` with Nests relay defaults
   - Configure `NPool` relay routing
   - Add MoQ transport dependencies to package.json

3. **Port transport layer**
   - Copy `transport/` directory as-is (no Snort dependencies except auth.ts)
   - Rewrite `transport/auth.ts` to use Nostrify signer interface
   - Verify transport compiles with new deps

4. **Set up constants**
   - Create `const.ts` with event kinds, default relays, default MoQ servers
   - Port color palette

### Phase 2: Authentication & Room Discovery [~2 days]

5. **Authentication**
   - mkstack already has LoginDialog, SignupDialog, AccountSwitcher
   - Customize login UI to match Nests styling
   - Verify NIP-07, NIP-46, nsec all work

6. **Room list / lobby**
   - Create `useRoomList` hook using TanStack Query + `nostr.query()`
   - Create `RoomCard` component with shadcn/ui Card
   - Create lobby page showing active/planned/ended rooms
   - Port presence count display

7. **Room creation**
   - Create `NewRoom` page with react-hook-form + zod validation
   - Use `useNostrPublish` for event creation
   - Port MoQ server list selection
   - Port banner/color picker

### Phase 3: Room View & Audio [~3 days]

8. **Room page**
   - Create room page with transport provider
   - Wire MoQ auth (NIP-98 with Nostrify signer)
   - Port auto-publish logic
   - Port participant discovery

9. **Participants UI**
   - Rebuild participant grid with shadcn/ui Avatar + Tooltip
   - Port speaking indicator hooks (no Snort deps)
   - Port hand raise display from presence events
   - Port mic enabled/muted display from presence events

10. **Room management**
    - Port profile card hover menu (add/remove stage, follow, kick)
    - Port room editing (title, description, permissions)
    - Port room ending
    - Port "rooms left open" cleanup modal

### Phase 4: Chat & Interactions [~2 days]

11. **Live chat**
    - Create chat message list using TanStack Query subscription
    - Port message sending via `useNostrPublish`
    - Port zap receipt display in chat
    - Port chat reactions
    - Port user muting (NIP-51 mute list)

12. **Reactions & emoji**
    - Port reaction button with emoji picker
    - Port reaction display on participant avatars

13. **Zaps**
    - mkstack already has `ZapDialog`, `useZaps`, NWC support
    - Wire zap button on participant avatars
    - Wire zap button on chat messages

### Phase 5: Settings & Profile [~1 day]

14. **Settings page**
    - Port MoQ server list management (kind:10112)
    - Use shadcn/ui form components

15. **Profile editing**
    - mkstack already has `EditProfileForm`
    - Customize for Nests (avatar, display name, lightning address)

16. **Profile viewing**
    - Port profile flyout/page
    - Port follow/unfollow
    - Port user's room history

### Phase 6: Polish & Cleanup [~1 day]

17. **Presence system**
    - Port presence sending (hand, mic state, onstage)
    - Port presence subscriptions
    - Port presence time filtering

18. **Admin commands**
    - Port kick command (kind:4312) sending and receiving

19. **PWA**
    - Add `manifest.webmanifest` to public/
    - Add vite-plugin-pwa if needed, or use mkstack's approach

20. **Share room**
    - Port share modal (broadcast note, copy URL, iCal)

21. **Routing**
    - Port naddr/npub resolution from nostr-route.tsx
    - mkstack already has NIP19Page for this

22. **Privacy policy**
    - Port updated privacy page

---

## File-by-File Migration Map

### Files that port directly (no/minimal changes)

| Source | Destination | Changes |
|---|---|---|
| `transport/types.ts` | `src/transport/types.ts` | None |
| `transport/moq-transport.ts` | `src/transport/moq-transport.ts` | None |
| `transport/hooks.ts` | `src/transport/hooks.ts` | None |
| `transport/provider.tsx` | `src/transport/provider.tsx` | None |
| `transport/index.ts` | `src/transport/index.ts` | None |
| `hooks/useSpeakingIndicator.ts` | `src/hooks/useSpeakingIndicator.ts` | None |
| `hooks/usePageVisibility.ts` | `src/hooks/usePageVisibility.ts` | None |
| `hooks/useHoverMenu.ts` | `src/hooks/useHoverMenu.ts` | None |
| `hooks/useCopy.ts` | `src/hooks/useCopy.ts` | None |
| `element/vu.tsx` | `src/components/VuBar.tsx` | None |

### Files that need Snort→Nostrify rewrite

| Source | Destination | Key changes |
|---|---|---|
| `transport/auth.ts` | `src/transport/auth.ts` | EventBuilder→signer.signEvent, EventSigner→NostrSigner |
| `hooks/usePresence.ts` | `src/hooks/usePresence.ts` | EventBuilder→signer.signEvent, useEventBuilder→useNostrPublish |
| `hooks/useRoomPresence.ts` | `src/hooks/useRoomPresence.ts` | RequestBuilder→useQuery+nostr.query |
| `hooks/useRoomReactions.ts` | `src/hooks/useRoomReactions.ts` | RequestBuilder→useQuery+nostr.query |
| `hooks/useEventModifier.ts` | `src/hooks/useEventModifier.ts` | EventExt→nostr-tools, signer→Nostrify |
| `hooks/useFollowing.ts` | `src/hooks/useFollowing.ts` | RequestBuilder→useQuery, EventPublisher→useNostrPublish |
| `hooks/useMuteList.ts` | `src/hooks/useMuteList.ts` | Same pattern changes |
| `hooks/useMoqServerList.ts` | `src/hooks/useMoqServerList.ts` | Same pattern changes |
| `hooks/useAdminCommands.ts` | `src/hooks/useAdminCommands.ts` | RequestBuilder→useQuery |
| `hooks/useChatActivity.ts` | `src/hooks/useChatActivity.ts` | RequestBuilder→useQuery |

### Files that get rebuilt with shadcn/ui

| Source | New component | Uses from mkstack |
|---|---|---|
| `element/button.tsx` | Drop | shadcn Button |
| `element/modal.tsx` | Drop | shadcn Dialog |
| `element/flyout.tsx` | Drop | shadcn Sheet |
| `element/icon-button.tsx` | Drop | shadcn Button + lucide icons |
| `element/spinner.tsx` | Drop | shadcn Skeleton or lucide Loader2 |
| `element/collapsed.tsx` | Drop | shadcn Collapsible or Accordion |
| `element/copy.tsx` | Drop | shadcn + useCopy |
| `element/qr.tsx` | Minimal rewrite | shadcn Dialog + qrcode lib |
| `element/avatar.tsx` | Rewrite | shadcn Avatar + useAuthor |
| `element/follow-button.tsx` | Rewrite | shadcn Button |
| `element/room-card.tsx` | Rewrite | shadcn Card |
| `element/device-selector.tsx` | Rewrite | shadcn Select |
| `element/chat-messages.tsx` | Rewrite | shadcn ScrollArea |
| `element/write-message.tsx` | Rewrite | shadcn Input + Button |
| `element/participants.tsx` | Rewrite | shadcn Avatar + Tooltip |
| `element/edit-room.tsx` | Rewrite | shadcn Dialog + react-hook-form |
| `element/profile-card.tsx` | Rewrite | shadcn DropdownMenu |
| `element/share-modal.tsx` | Rewrite | shadcn Dialog |
| `element/banner-editor.tsx` | Rewrite | shadcn + useUploadFile |
| `element/room-menu-bar.tsx` | Rewrite | shadcn DropdownMenu |
| `element/lobby-flyout.tsx` | Rewrite | shadcn Sheet |
| `element/join-room.tsx` | Rewrite | shadcn Card + Button |

### Files that drop entirely

| File | Reason |
|---|---|
| `login.ts` (625 lines) | Replaced by @nostrify/react/login |
| `wasm.ts` (28 lines) | Snort-specific, not needed |
| `intl.tsx` (88 lines) | Dropping i18n |
| `wallet.ts` (180 lines) | Replaced by mkstack NWCContext |
| `icon.tsx` (24 lines) | Replaced by lucide-react |
| `element/wallet.tsx` | Replaced by mkstack WalletModal |
| `element/wallet-balance.tsx` | Rewrite with mkstack wallet |
| `element/zap-modal.tsx` | Replaced by mkstack ZapDialog |
| `element/login.tsx` | Replaced by mkstack LoginDialog |
| `element/sign-up.tsx` | Replaced by mkstack SignupDialog |
| `element/text.tsx` | Replaced by mkstack NoteContent |
| `element/mention.tsx` | Replaced by mkstack NoteContent |
| `element/display-name.tsx` | Inline with useAuthor |
| `element/async.tsx` | Use shadcn Button loading state |
| `upload/nostrbuild.ts` | Replaced by mkstack useUploadFile (Blossom) |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Clean rewrite means app is broken during migration | High | Work on a separate branch, keep moq-migration branch as fallback |
| TanStack Query subscriptions behave differently than Snort's live subs | Medium | Test presence/chat carefully, may need `refetchInterval` for live data |
| Nostrify's NPool routing is different from Snort's system | Medium | Test relay connectivity thoroughly |
| shadcn/ui styling may not match current Nests dark theme | Low | Customize CSS variables, most components are unstyled |
| No WASM optimizer means potentially slower filter operations | Low | NPool is simpler, unlikely to need optimization for room-level queries |
| MoQ transport was tested with Snort, may have subtle integration issues | Low | Transport layer has no Snort deps except auth.ts |

---

## Estimated Effort

| Phase | Effort |
|---|---|
| Phase 1: Scaffold & Core | ~2 days |
| Phase 2: Auth & Room Discovery | ~2 days |
| Phase 3: Room View & Audio | ~3 days |
| Phase 4: Chat & Interactions | ~2 days |
| Phase 5: Settings & Profile | ~1 day |
| Phase 6: Polish & Cleanup | ~1 day |
| **Total** | **~11 days** |

The transport layer (the hard part of the MoQ migration) ports with zero changes. The majority of effort is rewriting Snort hooks to use Nostrify + TanStack Query patterns, and rebuilding UI with shadcn/ui.
