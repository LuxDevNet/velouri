// reshape.ts — expands short filter tokens into richer search queries.
// Other tokens pass through untouched.

export const DEFAULT_FILTERS = [
  "landscape",
  "portrait",
  "architecture",
  "nature",
  "studio",
] as const;

export type DefaultFilter = (typeof DEFAULT_FILTERS)[number];

const RESHAPE_MAP: Record<DefaultFilter, string> = {
  landscape: "landscape scenery horizon",
  portrait: "portrait face studio",
  architecture: "architecture building interior",
  nature: "nature forest ocean",
  studio: "studio product still_life",
};

export function reshape(token: string): string {
  const key = token.trim().toLowerCase();
  if ((RESHAPE_MAP as Record<string, string>)[key]) {
    return (RESHAPE_MAP as Record<string, string>)[key];
  }
  return token;
}

export function isDefaultFilter(token: string): token is DefaultFilter {
  return (DEFAULT_FILTERS as readonly string[]).includes(token);
}
