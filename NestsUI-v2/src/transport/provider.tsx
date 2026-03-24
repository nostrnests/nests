import { createContext, useEffect, useRef, type PropsWithChildren } from "react";
import type { NestTransport, TransportConfig } from "./types";
import { MoQAudioTransport } from "./moq-transport";

/**
 * React context for the transport instance.
 */
export const NestTransportContext = createContext<NestTransport | null>(null);

interface NestTransportProviderProps {
  /** Transport configuration. When this changes, the transport reconnects. */
  config: TransportConfig | null;
  /** Whether to connect. Set to false to defer connection (e.g., for lobby view). */
  connect?: boolean;
}

/**
 * Provides a NestTransport instance to the component tree.
 *
 * Manages the transport lifecycle: connects when config is provided and
 * connect=true, disconnects on unmount or config change.
 */
export function NestTransportProvider({
  config,
  connect: shouldConnect = true,
  children,
}: PropsWithChildren<NestTransportProviderProps>) {
  const transportRef = useRef<MoQAudioTransport | null>(null);

  // Create transport instance once
  if (!transportRef.current) {
    transportRef.current = new MoQAudioTransport();
  }

  const transport = transportRef.current;

  useEffect(() => {
    if (!config || !shouldConnect) {
      transport.disconnect();
      return;
    }

    // Connect with the new config
    transport.connect(config).catch((err) => {
      console.error("Failed to connect transport:", err);
    });

    return () => {
      transport.disconnect();
    };
  }, [
    transport,
    config?.serverUrl,
    config?.authUrl,
    config?.roomNamespace,
    config?.identity,
    config?.canPublish,
    shouldConnect,
  ]);

  return (
    <NestTransportContext.Provider value={transport}>
      {children}
    </NestTransportContext.Provider>
  );
}
