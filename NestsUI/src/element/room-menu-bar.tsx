import { NostrLink } from "@snort/system";
import { ReactNode, useEffect, useRef, useState } from "react";
import IconButton from "./icon-button";
import { useLogin } from "../login";
import { createPortal } from "react-dom";
import classNames from "classnames";
import Icon from "../icon";
import { useNostrRoom } from "../hooks/nostr-room-context";
import Modal from "./modal";
import { FormattedMessage } from "react-intl";
import ShareModal from "./share-modal";
import { ProfileEditor } from "./profile-editor";
import DeviceSelector from "./device-selector";
import Wallet from "./wallet";
import Flyout from "./flyout";
import { useLocalParticipant } from "../transport";

export function RoomOptionsButton({ link: _link }: { link: NostrLink }) {
  const [open, setOpen] = useState(false);
  const login = useLogin();
  const ref = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [share, setShare] = useState(false);
  const [w, setW] = useState(230);
  const [profileEdit, setProfileEdit] = useState(false);
  const [devices, setDevices] = useState(false);
  const [wallet, setWallet] = useState(false);
  const { isPublishing } = useLocalParticipant();
  const roomContext = useNostrRoom();

  const menuItem = (icon: string, text: ReactNode, onClick: () => void, className?: string) => {
    return (
      <div
        className={classNames(
          "flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4 hover:bg-foreground hover:text-primary transition cursor-pointer select-none",
          className,
        )}
        onClick={onClick}
      >
        <Icon name={icon} />
        <div>{text}</div>
      </div>
    );
  };

  useEffect(() => {
    const t = setInterval(() => {
      const elm = menuRef.current;
      if (!elm) return;
      if (elm.offsetWidth !== 0) {
        setW(elm.offsetWidth);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <IconButton
        className={`rounded-full aspect-square${open ? " text-highlight" : ""}`}
        name="dots"
        size={25}
        ref={ref}
        onClick={() => setOpen((s) => !s)}
      />
      {open &&
        ref.current &&
        createPortal(
          <div
            className="absolute bg-foreground-2 flex flex-col rounded-2xl select-none overflow-hidden whitespace-nowrap"
            ref={menuRef}
            style={{
              bottom: window.innerHeight - ref.current.getBoundingClientRect().top + 15,
              left: Math.min(window.innerWidth - w, ref.current.getBoundingClientRect().left),
            }}
          >
            {login.pubkey &&
              menuItem("person", <FormattedMessage defaultMessage="Profile" />, () => {
                setProfileEdit(true);
                setOpen(false);
              })}
            {menuItem("gear", <FormattedMessage defaultMessage="Devices" />, () => {
              setDevices(true);
              setOpen(false);
            })}
            {menuItem("share", <FormattedMessage defaultMessage="Share" />, () => {
              setShare(true);
              setOpen(false);
            })}
            {isPublishing &&
              login.pubkey &&
              menuItem("exit", <FormattedMessage defaultMessage="Leave Stage" />, () => {
                // TODO: Remove self from p tags via event update
                setOpen(false);
              })}
            {menuItem("wallet", <FormattedMessage defaultMessage="Wallet" />, () => {
              setWallet(true);
              setOpen(false);
            })}
            {menuItem("gear", <FormattedMessage defaultMessage="Audio Servers" />, () => {
              window.open("/settings", "_blank");
              setOpen(false);
            })}
          </div>,
          document.body,
        )}
      {share && (
        <Modal id="share-room" onClose={() => setShare(false)}>
          <ShareModal event={roomContext.event} onClose={() => setShare(false)} />
        </Modal>
      )}
      {profileEdit && (
        <Modal id="profile-editor" onClose={() => setProfileEdit(false)}>
          <ProfileEditor onClose={() => setProfileEdit(false)} />
        </Modal>
      )}
      {devices && (
        <Modal id="devices" onClose={() => setDevices(false)}>
          <DeviceSelector />
        </Modal>
      )}
      <Flyout side="left" show={wallet} onClose={() => setWallet(false)}>
        <Wallet />
      </Flyout>
    </>
  );
}
