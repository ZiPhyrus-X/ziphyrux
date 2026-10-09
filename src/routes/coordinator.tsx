import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace/shell";
import { NotImplemented } from "@/components/workspace/states";

export const Route = createFileRoute("/coordinator")({
  head: () => ({ meta: [{ title: "Coordinator — Ziphyrus X" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <WorkspaceShell role="coordinator" base="/coordinator" title="Coordinator" nav={[{ label: "Overview", icon: LayoutDashboard, href: "/coordinator" }]}>
      <NotImplemented what="The Coordinator workspace pages" />
    </WorkspaceShell>
  ),
});
