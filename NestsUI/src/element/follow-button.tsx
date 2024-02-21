import { FormattedMessage } from "react-intl";
import { PrimaryButton } from "./button";
import useFollowing from "../hooks/useFollowing";
import Icon from "../icon";

export default function FollowButton({ pubkey }: { pubkey: string }) {
  const { isFollowing, follow, unfollow } = useFollowing();

  const is = isFollowing(pubkey);
  return (
    <PrimaryButton
      className={is ? "!bg-delete" : ""}
      onClick={async () => {
        if (is) {
          await unfollow(pubkey);
        } else {
          await follow(pubkey);
        }
      }}
    >
      <div className="flex gap-2 items-center">
        <Icon name={is ? "user-x" : "user-plus"} />
        {is ? <FormattedMessage defaultMessage="Unfollow" /> : <FormattedMessage defaultMessage="Follow" />}
      </div>
    </PrimaryButton>
  );
}
