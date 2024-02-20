import Icon from "../icon";

export default function ListenerCount({ n }: { n: number }) {
  return (
    <div className="px-2 py-1 flex gap-1 items-center bg-white rounded-full text-black">
      <Icon name="people" />
      <span>{n}</span>
    </div>
  );
}
