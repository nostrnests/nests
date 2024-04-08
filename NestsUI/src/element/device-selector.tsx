import { useMediaDeviceSelect } from "@livekit/components-react";
import { FormattedMessage } from "react-intl";

export default function DeviceSelector() {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: "audioinput",
    requestPermissions: true,
  });

  return (
    <div className="flex flex-col gap-2">
      <h3>
        <FormattedMessage defaultMessage="Audio Devices" />
      </h3>
      {devices && (
        <select
          className="bg-foreground-2"
          onChange={(e) => setActiveMediaDevice(e.currentTarget.value)}
          value={activeDeviceId}
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      )}
      {!devices && (
        <b className="text-delete">
          <FormattedMessage defaultMessage="Permission not granted" />
        </b>
      )}
    </div>
  );
}
