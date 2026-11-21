export function isDatabaseConfigured() {
  return (
    !process.env.VERCEL ||
    Boolean(
      process.env.TURSO_DATABASE_URL?.startsWith("libsql://") &&
      process.env.TURSO_AUTH_TOKEN,
    )
  );
}
export function isAiConfigured() {
  return Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_FREE_TIER_CONFIRMED === "true",
  );
}
