import { NotionAPI } from "notion-client";
import { Client } from "@notionhq/client";
import { cache } from "react";
import { PageType } from "@/global/types";

// notion-client 는 내부적으로 got 을 쓰는데, got 의 기본 User-Agent
// ("got (https://github.com/sindresorhus/got)") 로 비공식 API 를 호출하면 노션이 403 으로 막는다.
const NOTION_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type NotionFetchOptions = Parameters<NotionAPI["fetch"]>[0];
type NotionRecord = { role?: string; value?: any };

// 노션 비공식 API 의 recordMap 레코드가 { role, value } 에서
// { spaceId, value: { role, value } } 로 바뀌면서 실제 블록이 한 단계 더 들어갔다.
// notion-client 와 화면 코드가 기대하는 { role, value } 형태로 되돌린다.
function unwrapRecordMap<T>(response: T): T {
  const recordMap = (response as any)?.recordMap;
  if (!recordMap) return response;

  for (const table of Object.values<any>(recordMap)) {
    if (!table || typeof table !== "object") continue;

    for (const [id, record] of Object.entries<NotionRecord>(table)) {
      const inner = record?.value;

      if (inner && typeof inner === "object" && "value" in inner) {
        table[id] = { ...record, role: inner.role ?? record.role, value: inner.value };
      }
    }
  }

  return response;
}

class WikiNotionAPI extends NotionAPI {
  async fetch<T>(options: NotionFetchOptions): Promise<T> {
    const response = await super.fetch<T>({
      ...options,
      gotOptions: {
        ...options.gotOptions,
        headers: { "user-agent": NOTION_USER_AGENT, ...options.gotOptions?.headers },
      },
    });

    return unwrapRecordMap(response);
  }
}

export const notion = new WikiNotionAPI();

export async function getData(rootPageId: string) {
  return await notion.getPage(rootPageId);
}

// 노션에 직접 업로드한 파일은 source 가 "attachment:<파일 id>:<파일명>" 형태로 내려온다.
// 이걸 그대로 <Image> 에 넘기면 next/image 최적화 서버가 http(s) 프로토콜이 아니라며 400 을 낸다.
// 노션이 실제 렌더링에 쓰는 이미지 프록시 URL 로 바꿔준다.
const NOTION_IMAGE_PROXY = "https://www.notion.so/image";

// 노션 이미지 프록시는 user-agent 로 서버 요청을 걸러서, next/image 최적화 서버가 대신 받아오면 403 이 난다.
// (getData 의 403 과 같은 이유다.) 그래서 브라우저가 직접 받아오도록 unoptimized 로 넘기고,
// 대신 노션 프록시가 지원하는 width 파라미터로 크기를 줄인다.
//
// .inline-image 가 max-width: 640px 이라 화면에 그려지는 최대 폭이 640px 이다.
// 이 값을 노션 프록시에 요청할 폭이자 <Image> 에 넘길 width 로 같이 쓴다.
const IMAGE_WIDTH = 640;

// 비율을 모르는 이미지가 로딩 전에 잡아둘 높이. 정사각형으로 두던 기존 동작을 유지한다.
const FALLBACK_IMAGE_HEIGHT = IMAGE_WIDTH;

type ImageBlock = {
  id: string;
  space_id?: string;
  properties?: { source?: string[][] };
  format?: { display_source?: string; block_aspect_ratio?: number };
};

export function getImageSource(block: ImageBlock) {
  const source = block.properties?.source?.[0]?.[0] ?? block.format?.display_source;
  if (!source) return null;

  // 노션은 업로드했거나 노션 안에서 크기를 조절한 이미지에만 세로/가로 비율을 같이 내려준다.
  // 이 값이 있으면 실제 비율대로 자리를 잡아둘 수 있어서 이미지가 뜰 때 화면이 밀리지 않는다.
  const aspectRatio = block.format?.block_aspect_ratio;
  const size = {
    width: IMAGE_WIDTH,
    height: aspectRatio ? Math.round(IMAGE_WIDTH * aspectRatio) : FALLBACK_IMAGE_HEIGHT,
  };

  // 깃허브/velog 처럼 외부에 올라간 이미지는 그대로 next/image 최적화를 태운다.
  if (source.startsWith("data:") || source.startsWith("http://") || source.startsWith("https://")) {
    return { ...size, src: source, unoptimized: false };
  }

  // "/images/..." 같은 노션 내부 경로는 절대 경로로 먼저 바꾼다.
  const target = source.startsWith("/") ? `https://www.notion.so${source}` : source;

  const url = new URL(`${NOTION_IMAGE_PROXY}/${encodeURIComponent(target)}`);
  url.searchParams.set("table", "block");
  url.searchParams.set("id", block.id);
  if (block.space_id) url.searchParams.set("spaceId", block.space_id);
  url.searchParams.set("width", String(IMAGE_WIDTH));
  url.searchParams.set("cache", "v2");

  return { ...size, src: url.toString(), unoptimized: true };
}

export const notionDatabase = new Client({
  auth: process.env.NOTION_API_SECRET,
});

export const getPageData = cache(async (category: string) => {
  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error("데이터베이스 아이디가 없습니다.");
  }
  let queryOption: { database_id: any; filter?: any } = { database_id: process.env.NOTION_DATABASE_ID };

  if (category) {
    queryOption.filter = {
      property: "Select",
      select: {
        equals: category,
      },
    };
  }
  // console.log(queryOption);
  const db = await notionDatabase.databases.query(queryOption);

  const pages = db.results as unknown as PageType[];

  // console.log(pages);
  return pages;
});
