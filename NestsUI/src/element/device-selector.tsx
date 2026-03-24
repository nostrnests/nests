import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

export default function DeviceSelector() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const [permissionGranted, setPermissionGranted] = useState(true);

  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission to enumerate devices
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setPermissionGranted(true);

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
        setDevices(audioInputs);

        if (audioInputs.length > 0 && !activeDeviceId) {
          setActiveDeviceId(audioInputs[0].deviceId);
        }
      } catch {
        setPermissionGranted(false);
      }
    }
    loadDevices();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h3>
        <FormattedMessage defaultMessage="Audio Devices" />
      </h3>
      {permissionGranted && devices.length > 0 && (
        <select
          className="bg-foreground-2"
          onChange={(e) => setActiveDeviceId(e.currentTarget.value)}
          value={activeDeviceId}
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      )}
      {!permissionGranted && (
        <b className="text-delete">
          <FormattedMessage defaultMessage="Permission not granted" />
        </b>
      )}
    </div>
  );
}
