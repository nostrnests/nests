import { Link } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { LoginArea } from "@/components/auth/LoginArea";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Mic, Radio, Users, Zap, Shield, Globe, ArrowRight, Headphones, MessageSquare, Heart } from "lucide-react";

export default function Index() {
  const { user } = useCurrentUser();

  useSeoMeta({
    title: "Nests - Live Audio Rooms on Nostr",
    description: "Host and join live audio conversations on the decentralized Nostr network. No algorithms, no gatekeepers, just real conversations.",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl gradient-1 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-base">N</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Nests</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/lobby">
              <Button variant="ghost" className="rounded-full">Rooms</Button>
            </Link>
            {user ? (
              <Link to="/new">
                <Button className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-lg shadow-purple-500/25">
                  Start a Room
                </Button>
              </Link>
            ) : (
              <LoginArea className="max-w-48" />
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden isolate">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse -z-10" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-pink-600/15 rounded-full blur-[100px] animate-pulse -z-10" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] -z-10" />

        <div className="mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-8">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Decentralized Audio Rooms on Nostr
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
              Your Space for{" "}
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
              Live Audio
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Host conversations, podcasts, and discussions with real-time audio.
            Powered by Nostr. No accounts needed, no algorithms, no gatekeepers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/lobby">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 text-lg px-8 h-12 shadow-xl shadow-purple-500/25 w-full sm:w-auto">
                <Headphones className="h-5 w-5 mr-2" />
                Explore Rooms
              </Button>
            </Link>
            {!user && (
              <Link to="/login">
                <Button size="lg" variant="outline" className="rounded-full text-lg px-8 h-12 border-white/10 hover:bg-white/5 w-full sm:w-auto">
                  Create Account
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Use Cases Ticker */}
      <section className="py-6 border-y border-white/5">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Mic, label: "Live Podcasts" },
              { icon: Users, label: "Group Chats" },
              { icon: Headphones, label: "Music Jams" },
              { icon: MessageSquare, label: "AMAs" },
              { icon: Radio, label: "Conferences" },
              { icon: Heart, label: "Community Calls" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-full bg-white/5 border border-white/5 px-4 py-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-purple-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Nests?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built different. Built on Nostr.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Mic className="h-6 w-6" />}
              gradient="from-purple-500 to-blue-500"
              title="Crystal-Clear Audio"
              description="Real-time audio powered by MoQ (Media over QUIC). Low latency, high quality, built for conversations."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              gradient="from-pink-500 to-orange-500"
              title="Own Your Identity"
              description="Your Nostr keys, your identity. No platform lock-in, no censorship, complete ownership of your social graph."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              gradient="from-blue-500 to-cyan-500"
              title="Truly Decentralized"
              description="Anyone can run an audio relay. No single server controls the network. Rooms work across any Nests-compatible client."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              gradient="from-yellow-500 to-orange-500"
              title="Lightning Zaps"
              description="Send sats to speakers in real-time. Show appreciation, support creators, and fuel the conversation."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              gradient="from-green-500 to-emerald-500"
              title="Audience Interaction"
              description="Raise your hand, get pulled on stage, share reactions. Every room is a living, breathing conversation."
            />
            <FeatureCard
              icon={<Radio className="h-6 w-6" />}
              gradient="from-red-500 to-pink-500"
              title="Run Your Own Relay"
              description="Spin up a Nests audio relay with a single docker-compose command. It's your infrastructure, your rules."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three steps to your first audio room.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign In", description: "Use any Nostr identity. Browser extension, mobile signer, or create a new key." },
              { step: "02", title: "Join or Create", description: "Browse live rooms or start your own in seconds. Choose a name, pick a vibe, go live." },
              { step: "03", title: "Talk & Listen", description: "Speakers share audio, listeners can raise their hand, and everyone can react and chat." },
            ].map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 mb-4">
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <div className="relative rounded-3xl overflow-hidden isolate">
            <div className="absolute inset-0 gradient-3 opacity-80 -z-10" />
            <div className="absolute inset-0 bg-black/40 -z-10" />
            <div className="px-8 py-16 lg:px-16 lg:py-20 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Join?</h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                Browse active rooms or start your own conversation. The microphone is yours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/lobby">
                  <Button size="lg" className="rounded-full bg-white text-black hover:bg-white/90 text-lg px-8 h-12 shadow-xl w-full sm:w-auto">
                    Enter the Lobby
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-6 w-6 rounded-md gradient-1 flex items-center justify-center">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              Built on Nostr. Open source and decentralized.
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/niclas-aspect/nests"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  gradient,
  title,
  description,
}: {
  icon: React.ReactNode;
  gradient: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all duration-300 hover:border-white/10">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-20 mb-4 shadow-lg`}>
        <div className="text-white">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
