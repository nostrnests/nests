import { FormattedMessage } from "react-intl";
import { PrimaryButton } from "./button";
import useFollowing from "../hooks/useFollowing";

export default function FollowButton({ pubkey }: { pubkey: string }) {
  const { isFollowing, follow, unfollow } = useFollowing();

  const is = isFollowing(pubkey);
  return (
    <PrimaryButton
      onClick={async () => {
        if (is) {
          await unfollow(pubkey);
        } else {
          await follow(pubkey);
        }
      }}
    >
      {is ? <FormattedMessage defaultMessage="Unfollow" /> : <FormattedMessage defaultMessage="Follow" />}
    </PrimaryButton>
  );
}
