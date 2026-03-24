# MKStack

**The Complete Framework for Building Nostr Clients with AI**

MKStack is an AI-powered framework for building Nostr applications with React 18.x, TailwindCSS 3.x, Vite, shadcn/ui, and Nostrify. Build powerful Nostr applications with AI-first development - from social feeds to private messaging, MKStack provides everything you need to create decentralized apps on the Nostr protocol.

## 🚀 Quick Start

Build your Nostr app in 3 simple steps:

### 1. Install & Create
```bash
npm install -g @getstacks/stacks
stacks mkstack
```

### 2. Build with AI
```bash
stacks agent
# Tell Dork AI what you want: "Build a group chat application"
```

### 3. Deploy Instantly
```bash
npm run deploy
# ✅ App deployed to NostrDeploy.com!
```

## ✨ What Makes MKStack Special

- **🤖 AI-First Development**: Build complete Nostr apps with just one prompt using Dork AI agent
- **⚡ 8 Minutes Average**: From idea to deployed application in minutes, not months
- **🔗 50+ NIPs Supported**: Comprehensive Nostr protocol implementation
- **🎨 Beautiful UI**: 48+ shadcn/ui components with light/dark theme support
- **🔐 Built-in Security**: NIP-07 browser signing, NIP-44 encryption, event validation
- **💰 Payments Ready**: Lightning zaps (NIP-57), Cashu wallets (NIP-60), Wallet Connect (NIP-47)
- **📱 Production Ready**: TypeScript, testing, deployment, and responsive design included

## 🛠 Technology Stack

- **React 18.x**: Stable version with hooks, concurrent rendering, and improved performance
- **TailwindCSS 3.x**: Utility-first CSS framework for styling
- **Vite**: Fast build tool and development server
- **shadcn/ui**: 48+ unstyled, accessible UI components built with Radix UI
- **Nostrify**: Nostr protocol framework for Deno and web
- **React Router**: Client-side routing with BrowserRouter
- **TanStack Query**: Data fetching, caching, and state management
- **TypeScript**: Type-safe JavaScript development

## 🎯 Real-World Examples

### Built with One Prompt

Each of these applications was created with just a single prompt to Dork AI:

- **Group Chat Application**: `"Build me a group chat application"`
  - [Live Demo](https://groupchat-74z9j26wq-mks-projects-1f1254c4.vercel.app/)

- **Decentralized Goodreads**: `"Build a decentralized goodreads alternative. Use OpenLibrary API for book data."`
  - [Live Demo](https://bookstr123-87phkwjcy-mks-projects-1f1254c4.vercel.app/)

- **Chess Game**: `"Build a chess game with NIP 64"`
  - [Live Demo](https://chess-l0d7ms7m3-mks-projects-1f1254c4.vercel.app/chess)

### Production Apps

Real Nostr applications built using MKStack:

- **[Chorus](https://chorus.community/)**: Facebook-style groups on Nostr with built-in eCash wallet
- **[Blobbi](https://www.blobbi.pet/)**: Digital pet companions that live forever on the decentralized web
- **[Treasures](https://treasures.to/)**: Decentralized geocaching adventure powered by Nostr

[Browse more apps made with MKStack →](https://nostrhub.io/apps/t/mkstack/)

## 🔧 Core Features

### Authentication & Users
- `LoginArea` component with account switching
- `useCurrentUser` hook for authentication state
- `useAuthor` hook for fetching user profiles
- NIP-07 browser signing support
- Multi-account management

### Nostr Protocol Support
- **Social Features**: User profiles (NIP-01), follow lists (NIP-02), reactions (NIP-25), reposts (NIP-18)
- **Messaging**: Private DMs (NIP-17), public chat (NIP-28), group chat (NIP-29), encryption (NIP-44)
- **Payments**: Lightning zaps (NIP-57), Cashu wallets (NIP-60), Nutzaps (NIP-61), Wallet Connect (NIP-47)
- **Content**: Long-form articles (NIP-23), file metadata (NIP-94), live events (NIP-53), calendars (NIP-52)

### Data Management
- `useNostr` hook for querying and publishing
- `useNostrPublish` hook with automatic client tagging
- Event validation and filtering
- Infinite scroll with TanStack Query
- Multi-relay support

### UI Components
- 48+ shadcn/ui components (buttons, forms, dialogs, etc.)
- `NoteContent` component for rich text rendering
- `EditProfileForm` for profile management
- `RelaySelector` for relay switching
- `CommentsSection` for threaded discussions
- Light/dark theme system

### Media & Files
- `useUploadFile` hook with Blossom server integration
- NIP-94 compatible file metadata
- Image and video support
- File attachment to events

### Advanced Features
- NIP-19 identifier routing (`npub1`, `note1`, `nevent1`, `naddr1`)
- Cryptographic operations (encryption/decryption)
- Lightning payments and zaps
- Real-time event subscriptions
- Responsive design with mobile support

## 🤖 AI Development with Dork

MKStack includes Dork, a built-in AI agent that understands your codebase and Nostr protocols:

### Supported AI Providers

Configure your AI provider with `stacks configure`:

- **OpenRouter** ([openrouter.ai](https://openrouter.ai/)): Enter your API key from settings
- **Routstr** ([routstr.com](https://www.routstr.com/)): Use Cashu tokens for payment
- **PayPerQ** ([ppq.ai](https://ppq.ai/)): OpenAI-compatible API

### How Dork Works

- **Context-Aware**: Understands your entire codebase and project structure
- **Nostr Expert**: Built-in knowledge of 50+ NIPs and best practices
- **Instant Implementation**: Makes changes directly to your code following React/TypeScript best practices

Example prompts:
```bash
"Add user profiles with avatars and bio"
"Implement NIP-17 private messaging"
"Add a dark mode toggle"
"Create a marketplace with NIP-15"
```

## 📁 Project Structure

```
src/
├── components/           # UI components
│   ├── ui/              # shadcn/ui components (48+ available)
│   ├── auth/            # Authentication components
│   └── comments/        # Comment system components
├── hooks/               # Custom React hooks
│   ├── useNostr         # Core Nostr integration
│   ├── useAuthor        # User profile data
│   ├── useCurrentUser   # Authentication state
│   ├── useNostrPublish  # Event publishing
│   ├── useUploadFile    # File uploads
│   └── useZaps          # Lightning payments
├── pages/               # Page components
├── lib/                 # Utility functions
├── contexts/            # React context providers
└── test/                # Testing utilities
```

## 🎨 UI Components

MKStack includes 48+ shadcn/ui components:

**Layout**: Card, Separator, Sheet, Sidebar, ScrollArea, Resizable
**Navigation**: Breadcrumb, NavigationMenu, Menubar, Tabs, Pagination
**Forms**: Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider
**Feedback**: Alert, AlertDialog, Toast, Progress, Skeleton
**Overlay**: Dialog, Popover, HoverCard, Tooltip, ContextMenu, DropdownMenu
**Data Display**: Table, Avatar, Badge, Calendar, Chart, Carousel
**And many more...

## 🔐 Security & Best Practices

- **Never use `any` type**: Always use proper TypeScript types
- **Event validation**: Filter events through validator functions for custom kinds
- **Efficient queries**: Minimize separate queries to avoid rate limiting
- **Proper error handling**: Graceful handling of invalid NIP-19 identifiers
- **Secure authentication**: Use signer interface, never request private keys directly

## 📱 Responsive Design

- Mobile-first approach with Tailwind breakpoints
- `useIsMobile` hook for responsive behavior
- Touch-friendly interactions
- Optimized for all screen sizes

## 🧪 Testing

- Vitest with jsdom environment
- React Testing Library with jest-dom matchers
- `TestApp` component provides all necessary context providers
- Mocked browser APIs (matchMedia, scrollTo, IntersectionObserver, ResizeObserver)

## 🚀 Deployment

Built-in deployment to NostrDeploy.com:

```bash
npm run deploy
```

Your app goes live instantly with:
- Automatic builds
- CDN distribution
- HTTPS support
- Custom domains available

## 📚 Documentation

For detailed documentation on building Nostr applications with MKStack:

- [Tutorial](https://soapbox.pub/blog/mkstack-tutorial)
- [Nostr Protocol Documentation](https://nostr.com)
- [shadcn/ui Components](https://ui.shadcn.com)

## 🤝 Contributing

MKStack is open source and welcomes contributions. The framework is designed to be:

- **Extensible**: Easy to add new NIPs and features
- **Maintainable**: Clean architecture with TypeScript
- **Testable**: Comprehensive testing setup included
- **Documented**: Clear patterns and examples

## 📄 License

Open source - build amazing Nostr applications and help grow the decentralized web!

---

**"Vibed with MKStack"** - [Learn more about MKStack](https://soapbox.pub/mkstack)

*Build your Nostr app in minutes, not months. Start with AI, deploy instantly.*