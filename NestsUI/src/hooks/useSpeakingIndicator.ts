import { useEffect, useState } from "react";
import { useNestTransport } from "../transport";

/**
 * Detect whether the local user is currently speaking based on mic audio levels.
 * Returns true when audio level exceeds a threshold.
 */
export function useLocalSpeaking(): boolean {
  const transport = useNestTransport();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Poll for the mic track (it may not be available immediately)
    const checkInterval = setInterval(() => {
      const track = transport.localAudioTrack;
      if (track) {
        clearInterval(checkInterval);
        startAnalysis(track);
      }
    }, 500);

    let analyserCleanup: (() => void) | null = null;

    function startAnalysis(track: MediaStreamTrack) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(new MediaStream([track]));
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const THRESHOLD = -50; // dB threshold for "speaking"

      const interval = setInterval(() => {
        if (track.readyState !== "live") {
          setSpeaking(false);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        // Calculate RMS volume in dB
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const dB = avg > 0 ? 20 * Math.log10(avg / 255) : -100;
        setSpeaking(dB > THRESHOLD);
      }, 100);

      analyserCleanup = () => {
        clearInterval(interval);
        source.disconnect();
        audioContext.close();
      };
    }

    return () => {
      clearInterval(checkInterval);
      analyserCleanup?.();
    };
  }, [transport]);

  return speaking;
}
