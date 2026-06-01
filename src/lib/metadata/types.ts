export interface MetadataResult {
  anilistId: number;
  english?: string;
  romaji?: string;
  native?: string;
}

export interface MetadataSource {
  searchTitle(query: string): Promise<MetadataResult | null>;
}
