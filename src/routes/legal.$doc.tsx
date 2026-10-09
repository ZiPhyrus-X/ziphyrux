import { createFileRoute, Link, notFound } from "@tanstack/react-router";

const DOCS: Record<string, string> = { privacy: "Privacy Policy", terms: "Terms of Use" };

export const Route = createFileRoute("/legal/$doc")({
  loader: ({ params }) => {
    if (!DOCS[params.doc]) throw notFound();
    return { title: DOCS[params.doc] };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Legal"} — Ziphyrus X` },
      { name: "description", content: `${loaderData?.title ?? "Legal"} for Ziphyrus X.` },
      { property: "og:title", content: `${loaderData?.title ?? "Legal"} — Ziphyrus X` },
      { property: "og:description", content: "Legal document placeholder for Ziphyrus X." },
    ],
  }),
  component: Legal,
});

function Legal() {
  const { title } = Route.useLoaderData();
  return (
    <main className="container-x max-w-3xl py-32">
      <Link to="/" className="eyebrow hover:text-foreground">← Back</Link>
      <h1 className="mt-8 font-display text-section">{title}</h1>
      <p className="mt-6 text-muted-foreground">This document has not been published yet. The final text will be provided by the Ziphyrus X team.</p>
    </main>
  );
}
