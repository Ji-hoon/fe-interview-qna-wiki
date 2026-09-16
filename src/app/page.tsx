import Link from "next/link";
import Header from "@/components/Header";
import GridContents from "@/components/GridContents";
import { getPageData } from "@/global/notion";

export const revalidate = 0;

export default async function Main() {
  const pages = await getPageData("");
  const categories = Array.from(
    new Set(
      pages
        .reverse()
        // 카테고리(Select)를 아직 지정하지 않은 문서가 섞여 있을 수 있다.
        // 한 건만 비어 있어도 홈 전체가 500 이 나므로 여기서 걸러낸다.
        .map((page) => page.properties.Select?.select?.name)
        .filter((name: string | undefined): name is string => Boolean(name))
    )
  );

  return (
    <>
      <Header>
        <h1 className="text-2xl font-bold">FE 기술 면접 Q&A 위키</h1>
        <div className="grow"></div>
        <Link href={"/about"}>About</Link>
      </Header>
      <section className="grid pb-6 grid-cols-1 lg:grid-cols-2">
        {categories.length > 0 &&
          categories.map((category, index) => (
            <GridContents key={`${index}_${category}`} category={category} pages={pages} restrict={4} />
          ))}
      </section>
    </>
  );
}
