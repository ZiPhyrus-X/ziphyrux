import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace/shell";
import { NotImplemented } from "@/components/workspace/states";

export const Route = createFileRoute("/editor")({
  head: () => ({ meta: [{ title: "Ziphyrus - X" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <WorkspaceShell role="editor" base="/editor" title="Editor" nav={[{ label: "Overview", icon: LayoutDashboard, href: "/editor" }]}>
      <NotImplemented what="The Editor workspace pages" />
    </WorkspaceShell>
  ),
});
