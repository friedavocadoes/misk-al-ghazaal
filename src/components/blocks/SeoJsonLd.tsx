/** Invisible JSON-LD blocks for crawlers (one script tag per block). */
export function SeoJsonLd({ blocks }: { blocks: Record<string, unknown>[] }) {
  if (!blocks.length) return null;
  return (
    <>
      {blocks.map((b, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
        />
      ))}
    </>
  );
}
