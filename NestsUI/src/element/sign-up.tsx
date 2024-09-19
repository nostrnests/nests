import { Link, useNavigate } from "react-router-dom";
import { PrimaryButton } from "./button";
import { useContext, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { EventPublisher } from "@snort/system";
import { loginWith } from "../login";
import { SnortContext } from "@snort/system-react";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const system = useContext(SnortContext);

  async function generateKey() {
    const newKey = new Uint8Array(32);
    crypto.getRandomValues(newKey);
    const builder = EventPublisher.privateKey(newKey);
    const meta = await builder.metadata({
      name: username,
    });
    await system.BroadcastEvent(meta);
    await loginWith("nsec", newKey);
    navigate("/");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center">
        <FormattedMessage defaultMessage="Create an account" />
      </h1>
      <div className="flex items-center bg-foreground-2 rounded-xl">
        <input
          type="text"
          placeholder={formatMessage({ defaultMessage: "Username" })}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <PrimaryButton onClick={generateKey}>
        <FormattedMessage defaultMessage="Create account" />
      </PrimaryButton>
      <p className="text-center">
        <FormattedMessage defaultMessage="Already have an account?" />
        &nbsp;
        <Link to="/login" className="text-highlight">
          <FormattedMessage defaultMessage="Sign in" />
        </Link>
      </p>
    </div>
  );
}
