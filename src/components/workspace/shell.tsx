import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronsLeft, ChevronsRight, FlaskConical, LogOut, Menu, type LucideIcon } from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authService, homeForRole, type Role, type Session } from "@/lib/auth/service";
import { PermissionDenied } from "@/components/workspace/states";
import { cn } from "@/lib/utils";

export interface NavItem { label: string; icon: LucideIcon; href: string }

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin", editor: "Editor", coordinator: "Coordinator", student: "Student", trainer: "Trainer", placement_officer: "Placement Officer", employer: "Employer",
};

function NavList({ nav, base, collapsed, onNavigate }: { nav: NavItem[]; base: string; collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="Workspace">
      {nav.map((n) => {
        const active = n.href === base ? path === base : path === n.href || path.startsWith(n.href + "/");
        return (
          <Link key={n.href} to={n.href as never} onClick={onNavigate} title={n.label} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground", collapsed && "justify-center px-0", active && "bg-sidebar-accent !text-sidebar-foreground [&_svg]:text-sidebar-primary")}>
            <n.icon className="h-4 w-4 shrink-0" />{!collapsed && <span>{n.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shared shell for every role workspace. Role-specific behaviour comes from
 * the `nav` config and `role`; the session role is the server-verified one.
 */
export function WorkspaceShell({ role, base, nav, title, headerExtra, children }: {
  role: Role; base: string; nav: NavItem[]; title: string; headerExtra?: ReactNode; children?: ReactNode;
}) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");

  useEffect(() => {
    const s = authService.getSession();
    if (!s) navigate({ to: "/login", replace: true });
    else setSession(s);
  }, [navigate]);

  if (!session) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking your session…</div>;
  if (session.user.role !== role) {
    const home = homeForRole(session.user.role);
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <PermissionDenied message={`This workspace is for the ${ROLE_LABEL[role]} role. You're signed in as ${ROLE_LABEL[session.user.role]}.`}
          action={home ? <Button asChild><Link to={home}>Go to my workspace</Link></Button> : undefined} />
      </div>
    );
  }

  const current = [...nav].sort((a, b) => b.href.length - a.href.length).find((n) => (n.href === base ? path === base : path.startsWith(n.href)));
  const signOut = () => { authService.signOut(); navigate({ to: "/login", replace: true }); };
  const initials = session.user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 md:flex", collapsed ? "w-16" : "w-64")}>
        <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
          {collapsed ? <span className="font-display text-xl">Z</span> : <Wordmark />}
        </div>
        <div className="flex-1 overflow-y-auto"><NavList nav={nav} base={base} collapsed={collapsed} /></div>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 border-t border-sidebar-border p-4 text-xs text-muted-foreground hover:text-foreground" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight className="mx-auto h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-0">
          <SheetTitle className="border-b border-sidebar-border p-4"><Wordmark /></SheetTitle>
          <NavList nav={nav} base={base} onNavigate={() => setMobile(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {session.source === "dev-mock" && (
          <div className="flex items-center justify-center gap-2 border-b border-dashed border-warning/50 bg-warning/10 py-1.5 text-xs text-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-warning" /> Development preview — simulated session and illustrative data
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu /></Button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <Link to={base as never} className="text-muted-foreground hover:text-foreground">{title}</Link>
            <span className="text-muted-foreground">/</span>
            <span className="truncate">{current?.label ?? "Overview"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {session.user.collegeName && <span className="mr-2 hidden border border-border px-2 py-1 font-mono text-xs text-muted-foreground lg:inline">{session.user.collegeName}</span>}
            {headerExtra}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-foreground font-mono text-xs text-background" aria-label="Account menu">{initials}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p>{session.user.name}</p>
                  <p className="font-mono text-xs font-normal text-muted-foreground">{session.user.loginId} · {ROLE_LABEL[session.user.role]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">Session started {new Date(session.issuedAt).toLocaleTimeString()}</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
