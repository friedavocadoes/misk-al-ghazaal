/** Add unprefixed route paths here to overlay the header on another page hero. */
export const TRANSPARENT_HEADER_PATHS: readonly string[] = ["/"];
export function hasTransparentHeader(path: string) { return TRANSPARENT_HEADER_PATHS.includes(path); }
