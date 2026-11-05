import { HomeStorefront } from "@/components/home-storefront";

type SearchParams = Promise<{ search?: string | string[]; sort?: string | string[] }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = Array.isArray(params.search) ? params.search[0] ?? "" : params.search ?? "";
  const sort = Array.isArray(params.sort) ? params.sort[0] ?? "" : params.sort ?? "";
  return <HomeStorefront initialSearch={search} sort={sort} />;
}
