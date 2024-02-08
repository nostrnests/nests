import { useEffect, useRef } from "react";

export default function VuBar({ track }: { track?: MediaStreamTrack }) {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (ref && track) {
            const audioContext = new AudioContext();

            const mediaStreamSource = audioContext.createMediaStreamSource(new MediaStream([track]));
            const analyser = audioContext.createAnalyser();
            const minVU = -60; // Minimum VU level in dB
            const maxVU = 0;   // Maximum VU level in dB
            analyser.minDecibels = -120;
            analyser.maxDecibels = 0;
            analyser.smoothingTimeConstant = 0.2;
            mediaStreamSource.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const calculateVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                const sum = dataArray.reduce((acc, v) => acc += v, 0) / dataArray.length;
                return (sum / 255) * (maxVU - minVU) + minVU;
            };

            const canvas = ref.current!;
            const ctx = canvas.getContext("2d")!;
            const t = setInterval(() => {
                const vol = calculateVolume();
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = "green";
                const barLen = (vol - minVU) / (maxVU - minVU) * canvas.width;
                ctx.fillRect(0, 0, barLen, canvas.height);
            }, 50);

            return () => {
                clearInterval(t);
                audioContext.close();
            }
        }
    }, [ref, track]);

    return <canvas ref={ref} width={200} height={10}></canvas>
}