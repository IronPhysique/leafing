export type SourceSort = "relevance" | "popularity" | "latest" | "alphabetical";
export type SourceStatus = "any" | "ongoing" | "completed" | "hiatus" | "cancelled";
export type SourceContentRating = "safe" | "suggestive" | "erotica";

export interface SourceFilters {
  sorts: SourceSort[];
  statuses: SourceStatus[];
  contentRatings: SourceContentRating[];
}

export interface SearchOptions {
  page?: number;
  sort?: SourceSort;
  status?: SourceStatus;
  contentRatings?: SourceContentRating[];
}

export interface SourceSeriesSummary {
  slug: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
}

export interface SourceSeriesDetail extends SourceSeriesSummary {
  description?: string;
  author?: string;
  artist?: string;
  status?: string;
  tags?: string[];
  altTitles?: string[];
  chapters: SourceChapterSummary[];
}

export interface SourceChapterSummary {
  ref: string;
  number: string;
  title?: string;
  language: string;
  group?: string;
  publishedAt?: string;
  externalUrl?: string;
}

export interface SourceChapterPages {
  ref: string;
  pages: SourcePage[];
}

export interface SourcePage {
  url: string;
  referer?: string;
  width?: number;
  height?: number;
  descramble?: unknown;
}

export interface Source {
  id: string;
  name: string;
  language: string;
  baseUrl: string;
  needsCloudflareBypass?: boolean;
  filters: SourceFilters;

  search(query: string, opts?: SearchOptions): Promise<SourceSeriesSummary[]>;
  getSeries(slug: string): Promise<SourceSeriesDetail>;
  getChapter(slug: string, chapterRef: string): Promise<SourceChapterPages>;
}
