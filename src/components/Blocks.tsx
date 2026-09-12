import * as notion from "notion-types";
import Image from "next/image";
import Link from "next/link";

export default function Blocks({ blocks }: { blocks: notion.BlockMap[] }) {
  return (
    <>
      {blocks
        .filter((block, index) => index >= 3)
        .map((blockItem, index) => {
          let block = blockItem.value as unknown as notion.BaseBlock;
          let type = block.type;

          // console.log(block);

          if (type === "image") {
            return (
              <Image
                key={index}
                className="inline-image"
                src={block.properties.source[0][0]}
                alt=""
                width="500"
                height="500"
              />
            );
          }
          if (type === "divider") {
            return <hr key={index} className="inline-divider" />;
          }
          if (type === "code") {
            return (
              <pre key={index} className="code-block">
                <code>{block.properties.title[0][0].replace(/\\n/gi, "</br>")}</code>
              </pre>
            );
          }
          if (type === "bookmark" || type === "external_object_instance") {
            let external_url_link = block.format?.original_url;
            return (
              <Link
                className="inline-link"
                target={"_blank"}
                key={index}
                href={type === "bookmark" ? block.properties.link[0][0] : external_url_link}
              >
                <span className="label">{type === "bookmark" ? block.properties.title[0][0] : external_url_link}</span>
                <span className="arrow">↗</span>
              </Link>
            );
          }
          if (type === "text") {
            let textData = block.properties?.title;
            return (
              <div key={index}>
                {textData?.map((text: String[], index: number) => {
                  return (
                    <span
                      key={index}
                      className={
                        text[1]?.[0][0] === "b"
                          ? "font-bold text-indigo-600"
                          : text[1]?.[0][0] === "c"
                          ? "inline-code"
                          : text[1]?.[0][0] === "_"
                          ? "underline"
                          : ""
                      }
                    >
                      {text[0]}
                    </span>
                  );
                })}
              </div>
            );
          }
        })}
    </>
  );
}
