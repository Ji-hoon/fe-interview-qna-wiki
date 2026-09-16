import { PageType } from "@/global/types";
import Link from "next/link";

export default function GridContents({
  category,
  pages,
  restrict,
  headless,
}: {
  category: string;
  pages: PageType[];
  restrict?: number;
  headless?: boolean;
}) {
  let count = 0;

  return (
    <div className="p-10 py-8 w-full">
      {headless || (
        <h3 className="text-xl mb-4 font-bold flex gap-2">
          {category}
          {/* <span className="capsule-label">
            {pages.filter((page) => page.properties.Select.select.name === category).length}
          </span> */}
        </h3>
      )}
      <ul className="main-list">
        {pages.map((page: PageType) => {
          if (restrict && count > restrict) {
            return;
          }
          if (page.properties.Select?.select?.name === category) {
            count++;

            return (
              <li key={page.id} className="flex">
                {/* <b>{page.properties.Tags.multi_select[0].name}</b> */}
                <Link
                  className="list-button"
                  // page.url 은 노션 도메인/제목에 따라 형태가 달라져 파싱이 깨진다. 블록 id 를 그대로 쓴다.
                  href={`/${category}/${page.id.replace(/-/g, "")}`}
                >
                  <span className="label">{page.properties.Name?.title?.[0]?.plain_text}</span>
                  <span className="arrow">→</span>
                </Link>
              </li>
            );
          }
        })}
        {restrict && count > restrict && (
          <li className="flex">
            <Link href={`/${category}`} className="list-button">
              {category} 카테고리의 질문 모두 보기
              <span className="arrow">→</span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
