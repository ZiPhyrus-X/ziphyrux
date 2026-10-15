import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronsLeft, ChevronsRight, FlaskConical, LogOut, Menu, Search } from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { authService, type Session } from "@/lib/auth/service";
import { ADMIN_NAV } from "@/features/super-admin/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Super Admin — Ziphyrus X" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="Super Admin">
      {ADMIN_NAV.map((n) => {
        const common = cn("flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground", collapsed && "justify-center px-0");
        const active = { className: "bg-sidebar-accent !text-sidebar-foreground [&_svg]:text-sidebar-primary" };
        const inner = <><n.icon className="h-4 w-4 shrink-0" />{!collapsed && <span>{n.label}</span>}</>;
        return n.slug ? (
          <Link key={n.label} to="/admin/m/$module" params={{ module: n.slug }} className={common} activeProps={active} onClick={onNavigate} title={n.label}>{inner}</Link>
        ) : (
          <Link key={n.label} to={n.to as "/admin"} className={common} activeProps={active} activeOptions={{ exact: n.to === "/admin" }} onClick={onNavigate} title={n.label}>{inner}</Link>
        );
      })}
    </nav>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = authService.getSession();
    if (!s || s.user.role !== "super_admin") navigate({ to: "/login", replace: true });
    else setSession(s);
  }, [navigate]);

  if (!session) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking your session…</div>;

  const current = ADMIN_NAV.find((n) => (n.slug ? path.endsWith(`/m/${n.slug}`) : n.to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(n.to)));
  const signOut = () => { authService.signOut(); navigate({ to: "/login" }); };

  return (
    <div className="flex min-h-screen">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar/80 backdrop-blur-xl transition-[width] duration-300 md:flex", collapsed ? "w-16" : "w-64")}>
        <div className={cn("flex h-14 items-center border-b border-sidebar-border/60 px-4", collapsed && "justify-center px-0")}>
          {collapsed ? <span className="font-display text-xl">Z</span> : <Wordmark />}
        </div>
        <div className="flex-1 overflow-y-auto"><NavList collapsed={collapsed} /></div>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 border-t border-sidebar-border/60 p-4 text-xs text-muted-foreground hover:text-foreground" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight className="mx-auto h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-72 bg-sidebar/90 backdrop-blur-2xl p-0">
          <SheetTitle className="border-b border-sidebar-border/60 p-4"><Wordmark /></SheetTitle>
          <NavList onNavigate={() => setMobile(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {session.source === "dev-mock" && (
          <div className="flex items-center justify-center gap-2 border-b border-dashed border-warning/50 bg-warning/10 py-1.5 text-xs text-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-warning" /> Development preview — simulated session and illustrative data
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/75 px-4 backdrop-blur-xl md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu /></Button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Super Admin</Link>
            <span className="text-muted-foreground">/</span>
            <span className="truncate">{current?.label ?? "Overview"}</span>
          </nav>
          <div className="relative ml-auto hidden w-64 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search colleges, accounts…" className="h-9 pl-9" aria-label="Global search" onKeyDown={(e) => { if (e.key === "Enter") navigate({ to: "/admin/accounts" as any }); }} />
          </div>
          <NotificationBell
            role="super_admin"
            align="end"
            manageLink="/admin/audit"
            manageLabel="View audit activity →"
            className="ml-auto lg:ml-0"
          />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="grid h-9 w-9 place-items-center rounded-full bg-foreground font-mono text-xs text-background" aria-label="Account menu">SA</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <p>{session.user.name}</p>
                <p className="font-mono text-xs font-normal text-muted-foreground">{session.user.loginId} · Super Admin</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/admin/account" as any })}>My Account</DropdownMenuItem>
              <DropdownMenuItem disabled className="text-xs">Session started {new Date(session.issuedAt).toLocaleTimeString()}</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
