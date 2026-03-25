import { Link } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";

export default function Privacy() {
  useSeoMeta({
    title: "Privacy - Nests",
    description: "Privacy policy for Nests audio rooms on Nostr",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <article className="prose prose-invert prose-sm max-w-none space-y-6">
          <h1 className="text-2xl font-bold">Privacy Policy</h1>

          <p className="text-muted-foreground">Last updated: March 2026</p>

          <h2 className="text-lg font-semibold">How Nests Works</h2>
          <p>
            Nests is a decentralized audio room application built on the Nostr protocol. There are no accounts, no central servers storing your data, and no tracking. Your identity is your Nostr keypair.
          </p>

          <h2 className="text-lg font-semibold">What Data Exists</h2>
          <ul className="list-disc pl-5 space-y-2 text-foreground/80">
            <li><strong>Nostr Events:</strong> Room creation, chat messages, reactions, presence, and profile data are published as Nostr events to public relays you configure. These are signed with your key and visible to anyone on those relays.</li>
            <li><strong>Audio Streams:</strong> Audio is transmitted in real-time through MoQ relay servers. Audio is not recorded or stored — it exists only during the live session.</li>
            <li><strong>Local Storage:</strong> Your login credentials (nsec or bunker session) and app preferences are stored in your browser's local storage. They never leave your device.</li>
          </ul>

          <h2 className="text-lg font-semibold">What We Don't Do</h2>
          <ul className="list-disc pl-5 space-y-2 text-foreground/80">
            <li>We don't track you</li>
            <li>We don't use cookies or analytics</li>
            <li>We don't store your messages — they live on Nostr relays</li>
            <li>We don't record audio</li>
            <li>We don't have accounts — your Nostr key is your identity</li>
          </ul>

          <h2 className="text-lg font-semibold">Third-Party Services</h2>
          <p>
            Nests connects to Nostr relays and MoQ audio servers that you or room hosts configure. These are third-party services with their own policies. The default relays and audio servers are operated by the Nests team.
          </p>

          <h2 className="text-lg font-semibold">Open Source</h2>
          <p>
            Nests is fully open source. You can review the code, run your own instance, and verify everything at{" "}
            <a href="https://github.com/nostrnests/nests" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              github.com/nostrnests/nests
            </a>.
          </p>

          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions? Find us on Nostr or open an issue on GitHub.
          </p>
        </article>
      </main>
    </div>
  );
}
