import { Link } from "react-router-dom";
import { PrimaryButton } from "./button";
import Logo from "./logo";
import Avatar from "./avatar";
import { useLogin } from "../login";
import { FormattedMessage } from "react-intl";
import IconButton from "./icon-button";
import Icon from "../icon";

export default function Header() {
  const login = useLogin();
  return (
    <div className="flex justify-between lg:px-10 max-lg:px-4 lg:pt-8 max-lg:pt-3 pb-1 items-center">
      <Logo />
      <div className="flex gap-4 items-center">
        {!login.pubkey && (
          <>
            <Link to="/login">
              <PrimaryButton>
                <FormattedMessage defaultMessage="Login" />
              </PrimaryButton>
            </Link>
          </>
        )}
        {login.pubkey && (
          <>
            <PrimaryButton
              onClick={() => {
                login.update?.((s) => {
                  s.lobbyType = s.lobbyType === "all" ? "following" : "all";
                });
              }}
            >
              <div className="flex gap-2 items-center">
                {login.lobbyType === "all" ? (
                  <FormattedMessage defaultMessage="All rooms" />
                ) : (
                  <FormattedMessage defaultMessage="Following" />
                )}
                <Icon name="chevron" className="-rotate-90" />
              </div>
            </PrimaryButton>
            <Link to="/new">
              <IconButton name="plus" className="bg-primary hover:bg-primary/80 rounded-full aspect-square" />
            </Link>
            <Avatar pubkey={login.pubkey} link={true} size={40} />
          </>
        )}
      </div>
    </div>
  );
}
