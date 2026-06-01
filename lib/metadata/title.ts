export interface TitleFields {
  english?: string;
  romaji?: string;
  native?: string;
}

export function resolveDisplayTitle({ english, romaji }: TitleFields): string {
  return english ?? romaji ?? "Untitled";
}

export function searchHaystack({ english, romaji, native }: TitleFields): string {
  return [english, romaji, native]
    .filter((v): v is string => v !== undefined && v !== null && v.length > 0)
    .join(" ")
    .toLowerCase();
}
