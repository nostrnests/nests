import { useEffect, useRef, type PropsWithChildren } from "react";
import type { TransportConfig } from "./types";
import { MoQAudioTransport } from "./moq-transport";
import { NestTransportContext } from "./context";

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

  // Track the latest config so the effect below can read fresh values
  // (e.g. token) without reconnecting when only those values change.
  const configRef = useRef(config);
  configRef.current = config;

  const serverUrl = config?.serverUrl;
  const authUrl = config?.authUrl;
  const roomNamespace = config?.roomNamespace;
  const identity = config?.identity;
  const canPublish = config?.canPublish;

  useEffect(() => {
    const currentConfig = configRef.current;
    if (!currentConfig || !shouldConnect) {
      transport.disconnect();
      return;
    }

    // Connect with the new config
    transport.connect(currentConfig).catch((err) => {
      console.error("Failed to connect transport:", err);
    });

    return () => {
      transport.disconnect();
    };
  }, [transport, serverUrl, authUrl, roomNamespace, identity, canPublish, shouldConnect]);

  return (
    <NestTransportContext.Provider value={transport}>
      {children}
    </NestTransportContext.Provider>
  );
}
