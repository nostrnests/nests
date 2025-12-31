import { Link } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../element/button";
import Logo from "../element/logo";
import { FormattedMessage } from "react-intl";
import { useLogin } from "../login";
import Icon from "../icon";
import HeroBg from "../assets/hero-bg.png";

export default function Home() {
  const login = useLogin();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex justify-between lg:px-10 max-lg:px-4 lg:pt-8 max-lg:pt-3 pb-1 items-center">
        <Logo />
        <div className="flex gap-4 items-center">
          <Link to="/lobby">
            <SecondaryButton>
              <FormattedMessage defaultMessage="Browse Rooms" />
            </SecondaryButton>
          </Link>
          {!login.pubkey && (
            <Link to="/login">
              <PrimaryButton>
                <FormattedMessage defaultMessage="Login" />
              </PrimaryButton>
            </Link>
          )}
          {login.pubkey && (
            <Link to="/new">
              <PrimaryButton>
                <FormattedMessage defaultMessage="Start a Room" />
              </PrimaryButton>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32 relative overflow-hidden min-h-[70vh]"
        style={{
          backgroundImage: `url(${HeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Gradient fade at edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

        {/* Content card with glass effect */}
        <div className="relative z-10 backdrop-blur-sm bg-white/5 rounded-3xl p-8 lg:p-12 border border-white/10 max-w-4xl mx-4 shadow-2xl">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg">
            <FormattedMessage defaultMessage="Your Space for Live Audio" />
          </h1>
          <p className="text-xl lg:text-2xl text-gray-200 max-w-3xl mb-6">
            <FormattedMessage defaultMessage="Nostr Nests is an open audio space for chatting, jamming, micro-conferences, live podcast recordings, and more." />
          </p>
          <p className="text-lg text-gray-300 max-w-2xl mb-10 mx-auto">
            <FormattedMessage defaultMessage="Powered by Nostr and completely decentralized. No algorithms, no gatekeepers, just real conversations." />
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link to="/lobby">
              <PrimaryButton className="text-lg px-8 py-3 shadow-lg hover:shadow-primary/25 transition-shadow">
                <div className="flex gap-2 items-center">
                  <Icon name="people" />
                  <FormattedMessage defaultMessage="Explore Rooms" />
                </div>
              </PrimaryButton>
            </Link>
            {!login.pubkey && (
              <Link to="/sign-up">
                <SecondaryButton className="text-lg px-8 py-3">
                  <FormattedMessage defaultMessage="Create Account" />
                </SecondaryButton>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="px-4 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UseCaseChip icon="mic" label={<FormattedMessage defaultMessage="Live Podcasts" />} />
            <UseCaseChip icon="people" label={<FormattedMessage defaultMessage="Group Chats" />} />
            <UseCaseChip icon="audio" label={<FormattedMessage defaultMessage="Music Jams" />} />
            <UseCaseChip icon="share" label={<FormattedMessage defaultMessage="Conferences" />} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16">
            <FormattedMessage defaultMessage="Why Nests?" />
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <FeatureCard
              icon="mic"
              title={<FormattedMessage defaultMessage="Live Audio" />}
              description={
                <FormattedMessage defaultMessage="Host conversations, podcasts, and discussions with crystal-clear real-time audio." />
              }
            />
            <FeatureCard
              icon="zap"
              title={<FormattedMessage defaultMessage="Own Your Identity" />}
              description={
                <FormattedMessage defaultMessage="Your Nostr keys, your identity. No platform lock-in, no censorship, complete ownership." />
              }
            />
            <FeatureCard
              icon="people"
              title={<FormattedMessage defaultMessage="Community First" />}
              description={
                <FormattedMessage defaultMessage="Connect with your followers and discover new voices in the decentralized social space." />
              }
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 lg:py-24 bg-foreground rounded-3xl mx-4 lg:mx-10 mb-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            <FormattedMessage defaultMessage="Ready to Join?" />
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            <FormattedMessage defaultMessage="Browse active rooms or start your own conversation today." />
          </p>
          <Link to="/lobby">
            <PrimaryButton className="text-lg px-10 py-4">
              <div className="flex gap-2 items-center">
                <FormattedMessage defaultMessage="Enter the Lobby" />
                <Icon name="chevron" className="-rotate-90" />
              </div>
            </PrimaryButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-gray-500">
        <p className="mb-4">
          <FormattedMessage defaultMessage="Built on Nostr. Open source and decentralized." />
        </p>
        <div className="flex gap-6 justify-center">
          <a
            href="https://github.com/nostrnests/nests"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <Link to="/privacy" className="hover:text-white transition-colors">
            <FormattedMessage defaultMessage="Privacy Policy" />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="bg-foreground rounded-2xl p-6 lg:p-8">
      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
        <Icon name={icon} className="text-primary" size={24} />
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function UseCaseChip({ icon, label }: { icon: string; label: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-foreground/50 rounded-full px-5 py-3">
      <Icon name={icon} className="text-primary" size={18} />
      <span className="font-medium">{label}</span>
    </div>
  );
}
