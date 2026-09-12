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
