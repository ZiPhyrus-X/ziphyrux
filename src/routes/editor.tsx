import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/workspace/shell";
import { EDITOR_NAV } from "@/features/editor/nav";

export const Route = createFileRoute("/editor")({
  head: () => ({ meta: [{ title: "Ziphyrus - X" }, { name: "robots", content: "noindex" }] }),
  component: () => <WorkspaceShell role="editor" base="/editor" title="Editor" nav={EDITOR_NAV} />,
});
