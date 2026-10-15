import { createFileRoute, notFound } from "@tanstack/react-router";
import { History, Shield, User } from "lucide-react";
import { PageHeader, Panel } from "@/features/editor/page";
import { type EditorModuleSlug, EDITOR_NAV } from "@/features/editor/nav";
import { authService } from "@/lib/auth/service";

const DESC: Record<EditorModuleSlug, string> = {
  history: "Audit trail of learning content versions, blueprints snapshots, and feature modifications.",
  account: "Editor account details, active session scope, and cryptographic authority tokens.",
};

export const Route = createFileRoute("/editor/m/$module")({
  loader: ({ params }) => {
    if (!(params.module in DESC)) throw notFound();
    return { slug: params.module as EditorModuleSlug };
  },
  head: () => ({
    meta: [
      { title: "Editor Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorModulePage,
});

function EditorModulePage() {
  const { slug } = Route.useLoaderData();
  const label = EDITOR_NAV.find((n) => n.slug === slug)?.label ?? "";
  const session = authService.getSession();

  return (
    <div>
      <PageHeader title={label} desc={DESC[slug]} />

      {slug === "account" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Editor Principal Details">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Name:</span>
                <p className="font-medium">{session?.user.name ?? "Platform Editor"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Login Identifier:</span>
                <p className="font-mono">{session?.user.loginId}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Assigned Role:</span>
                <p className="font-semibold text-primary uppercase">{session?.user.role}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Protected Policy:</span>
                <p className="text-xs text-muted-foreground">
                  Permanent Editor account (editor1@ziphyrus.in) is protected under Ziphyrus X policy and cannot be deactivated.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Security & Scoping Invariants">
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground">Feature Authority:</strong> Editor manages platform feature gates and content hierarchy.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground">Zero Attendance Law:</strong> Editor and platform have zero attendance tables, registers, or metrics.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground">Immutable History:</strong> Official assessment results and historical attempts cannot be modified by the Editor UI.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {slug === "history" && (
        <Panel title="Content Publication History">
          <div className="space-y-4 py-2">
            <div className="rounded border border-border p-3 text-xs">
              <div className="flex justify-between font-medium">
                <span>CRS-001: Data Structures & Algorithmic Thinking</span>
                <span className="text-muted-foreground">v1.0 Published</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Initial syllabus release published for active academic sessions.
              </p>
            </div>
            <div className="rounded border border-border p-3 text-xs">
              <div className="flex justify-between font-medium">
                <span>CRS-002: Modern React & Frontend Systems</span>
                <span className="text-muted-foreground">v1.0 Published</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Frontend architecture modules verified and approved.
              </p>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
