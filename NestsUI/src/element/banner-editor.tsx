import { useEffect, useState } from "react";
import { ColorPalette } from "../const";
import { openFile } from "../upload";
import nostrBuildUpload from "../upload/nostrbuild";
import Spinner from "./spinner";
import { useLogin } from "../login";

export default function BannerEditor({
  initialColor,
  initialImage,
  onImage,
  onColor,
}: {
  initialColor?: string;
  initialImage?: string;
  onImage: (url?: string) => void;
  onColor: (color?: string) => void;
}) {
  const login = useLogin();
  const [bgType, setBgType] = useState<"color" | "image">("color");
  const [image, setImage] = useState(initialImage);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [color, setColor] = useState(initialColor ?? ColorPalette[0]);

  useEffect(() => {
    onImage(image);
  }, [image, onImage]);
  useEffect(() => {
    onColor(color);
  }, [color, onColor]);

  return (
    <div>
      <div className="font-medium mb-2">Banner Color or Image</div>
      <div className="flex gap-1 mb-2">
        <div
          className={`${bgType === "color" ? "bg-primary " : ""}rounded-full px-3 py-1 cursor-pointer`}
          onClick={() => {
            setBgType("color");
            setImage(undefined);
          }}
        >
          Color
        </div>
        <div
          className={`${bgType === "image" ? "bg-primary " : ""}rounded-full px-3 py-1 cursor-pointer`}
          onClick={() => setBgType("image")}
        >
          Image
        </div>
      </div>
      {bgType === "color" && (
        <div className="flex gap-4 flex-wrap">
          {ColorPalette.map((a) => (
            <div
              className={`w-8 h-8 rounded-full cursor-pointer${a === color ? " outline outline-2" : ""} bg-${a}`}
              key={a}
              onClick={() => setColor(a)}
            ></div>
          ))}
        </div>
      )}
      {bgType === "image" && (
        <div
          className="outline outline-1 outline-dashed cursor-pointer rounded-xl text-primary flex justify-center overflow-hidden"
          onClick={async () => {
            setImageProcessing(true);
            try {
              const f = await openFile();
              if (f) {
                const res = await nostrBuildUpload(f, login.signer);
                if (res.url) {
                  setImage(res.url);
                }
              }
            } finally {
              setImageProcessing(false);
            }
          }}
        >
          {image && !imageProcessing && <img src={image} />}
          {!image && !imageProcessing && <span className="leading-10">Select image</span>}
          {imageProcessing && <Spinner size={30} />}
        </div>
      )}
    </div>
  );
}
