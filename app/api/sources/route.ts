import { listSources } from "@/lib/sources";

export async function GET() {
  return Response.json({
    sources: listSources().map((s) => ({
      id: s.id,
      name: s.name,
      language: s.language,
      baseUrl: s.baseUrl,
      filters: s.filters,
    })),
  });
}
