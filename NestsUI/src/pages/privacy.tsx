import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import Icon from "../icon";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex justify-between lg:px-10 max-lg:px-4 lg:pt-8 max-lg:pt-3 pb-1 items-center">
        <Link to="/" className="flex items-center gap-2 text-highlight">
          <Icon name="chevron" className="rotate-180" />
          <FormattedMessage defaultMessage="Back" />
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-foreground rounded-2xl p-6 lg:p-8">
          <h1 className="text-2xl font-bold mb-2">
            <FormattedMessage defaultMessage="Privacy Policy" />
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            <FormattedMessage defaultMessage="Last updated: December 31, 2025" />
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Overview" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="Nostr Nests is built with privacy in mind. We do not collect, store, or track any personal data." />
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Data Collection" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="Nostr Nests does not collect any user data. We do not use analytics, tracking pixels, cookies for tracking purposes, or any other data collection mechanisms." />
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Nostr Protocol" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="Nostr Nests is a Nostr client application. Any data you publish through Nostr Nests is broadcast to the Nostr network according to the Nostr protocol. This data is stored on Nostr relays, which are independent servers not operated by us. Please be aware that information published to Nostr is public by design." />
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Audio & Voice Data" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="When participating in audio rooms, your voice is transmitted in real-time through LiveKit servers. This audio data is not recorded or stored by Nostr Nests unless a room host explicitly enables recording. Audio streams are ephemeral and are not retained after a room ends." />
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Local Storage" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="Nostr Nests may store preferences and session data locally on your device using browser storage. This data never leaves your device and is not accessible to us." />
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Third-Party Services" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="Nostr Nests connects to Nostr relays and LiveKit audio servers to function. These services are operated by third parties and may have their own privacy policies. We recommend reviewing the privacy practices of any services you use." />
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">
                <FormattedMessage defaultMessage="Contact" />
              </h2>
              <p className="text-gray-400">
                <FormattedMessage defaultMessage="If you have questions about this privacy policy, you can reach us through the Nostr network." />
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
