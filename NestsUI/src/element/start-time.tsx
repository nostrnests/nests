import dayjs from "dayjs";

export default function StartTime({ n }: { n: number }) {
  const start = new Date(n * 1000);
  return (
    <div className="px-2 py-1 flex gap-1 items-center bg-white rounded-full text-black">
      {dayjs(start).format("lll")}
    </div>
  );
}
