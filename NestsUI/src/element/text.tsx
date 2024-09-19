import { transformText, ParsedFragment, parseNostrLink } from "@snort/system";
import { useMemo } from "react";
import Mention from "./mention";

export default function Text({ content, tags }: { content: string; tags: Array<Array<string>> }) {
  const frags = useMemo(() => {
    return transformText(content, tags);
  }, [content, tags]);

  function renderFrag(frag: ParsedFragment) {
    switch (frag.type) {
      case "link":
        return (
          <a href={frag.content} rel="noreferer" target="_blank" className="text-highlight">
            {frag.content}
          </a>
        );
      case "media": {
        if (frag.mimeType?.startsWith("image/")) {
          return <img src={frag.content} />;
        }
        return frag.content;
      }
      case "mention":
        return <Mention link={parseNostrLink(frag.content)} />;
      default:
        return frag.content;
    }
  }

  return <div className="whitespace-pre">{frags.map(renderFrag)}</div>;
}
