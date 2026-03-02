export const LOCALES = ["en", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

