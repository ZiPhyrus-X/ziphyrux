import { createFileRoute } from "@tanstack/react-router";
import GlyphWall from "@/components/originkit/ui/glyph-wall";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZIPHYRUS — Glyph Wall" },
      {
        name: "description",
        content: "ZIPHYRUS emerges from an illuminated wall of glyphs.",
      },
      { property: "og:title", content: "ZIPHYRUS — Glyph Wall" },
      {
        property: "og:description",
        content: "ZIPHYRUS emerges from an illuminated wall of glyphs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <section className="glyph-section" aria-label="ZIPHYRUS glyph wall">
      <h1 className="sr-only">ZIPHYRUS</h1>
      <GlyphWall revealText="ZIPHYRUS" />
    </section>
  );
}
