import { z } from "zod";
import type { MetadataResult, MetadataSource } from "./types";

const ANILIST_URL = "https://graphql.anilist.co";

const QUERY = `
  query ($q: String) {
    Media(search: $q, type: MANGA) {
      id
      title {
        english
        romaji
        native
      }
    }
  }
`;

const AniListResponseSchema = z.object({
  data: z.object({
    Media: z
      .object({
        id: z.number(),
        title: z.object({
          english: z.string().nullable().optional(),
          romaji: z.string().nullable().optional(),
          native: z.string().nullable().optional(),
        }),
      })
      .nullable(),
  }),
});

function nullableStringToOptional(
  value: string | null | undefined
): string | undefined {
  return value == null ? undefined : value;
}

class AniListMetadataSource implements MetadataSource {
  async searchTitle(query: string): Promise<MetadataResult | null> {
    let json: unknown;
    try {
      const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { q: query } }),
      });
      json = await res.json();
    } catch {
      return null;
    }

    const parsed = AniListResponseSchema.safeParse(json);
    if (!parsed.success) return null;

    const media = parsed.data.data.Media;
    if (!media) return null;

    return {
      anilistId: media.id,
      english: nullableStringToOptional(media.title.english),
      romaji: nullableStringToOptional(media.title.romaji),
      native: nullableStringToOptional(media.title.native),
    };
  }
}

const anilistSource: MetadataSource = new AniListMetadataSource();
export default anilistSource;
