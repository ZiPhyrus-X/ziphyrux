import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Building2, ChevronsLeft, ChevronsRight, FlaskConical, LogOut, Menu, Shield } from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { authService, type Session } from "@/lib/auth/service";
import { COORDINATOR_NAV } from "@/features/coordinator/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coordinator")({
  head: () => ({
    meta: [
      { title: "Coordinator Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoordinatorLayout,
});

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="Coordinator Navigation">
      {COORDINATOR_NAV.map((n) => {
        const common = cn(
          "flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center px-0"
        );
        const active = { className: "bg-sidebar-accent !text-sidebar-foreground [&_svg]:text-sidebar-primary" };
        const inner = (
          <>
            <n.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{n.label}</span>}
          </>
        );
        return n.slug ? (
          <Link
            key={n.label}
            to="/coordinator/m/$module"
            params={{ module: n.slug }}
            className={common}
            activeProps={active}
            onClick={onNavigate}
            title={n.label}
          >
            {inner}
          </Link>
        ) : (
          <Link
            key={n.label}
            to={n.to as "/coordinator"}
            className={common}
            activeProps={active}
            activeOptions={{ exact: n.to === "/coordinator" }}
            onClick={onNavigate}
            title={n.label}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

const WORKFLOW_HUBS = [
  {
    id: "academics",
    label: "Academics",
    items: [
      { label: "Academic Structure", to: "/coordinator/academic" },
      { label: "Classes & Sections", to: "/coordinator/m/$module", slug: "classes" },
      { label: "Batches", to: "/coordinator/batches" },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { label: "Students", to: "/coordinator/students" },
      { label: "Registration", to: "/coordinator/registration" },
      { label: "Trainers", to: "/coordinator/trainers" },
      { label: "Placement Officers", to: "/coordinator/placement-officers" },
    ],
  },
  {
    id: "training",
    label: "Training",
    items: [
      { label: "Class Allocation", to: "/coordinator/allocations" },
      { label: "Schedule", to: "/coordinator/schedule" },
      { label: "Sessions", to: "/coordinator/sessions" },
      { label: "Action Plans", to: "/coordinator/action-plans" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { label: "Courses", to: "/coordinator/m/$module", slug: "training" },
      { label: "Performance", to: "/coordinator/m/$module", slug: "performance" },
      { label: "Skills", to: "/coordinator/m/$module", slug: "skills" },
      { label: "Placement Readiness", to: "/coordinator/m/$module", slug: "placement-readiness" },
      { label: "Requirements", to: "/coordinator/m/$module", slug: "placement-requirements" },
    ],
  },
  {
    id: "admin",
    label: "Data & Reports",
    items: [
      { label: "Imports & Exports", to: "/coordinator/m/$module", slug: "imports-exports" },
      { label: "Reports", to: "/coordinator/m/$module", slug: "reports" },
      { label: "Notifications", to: "/coordinator/m/$module", slug: "notifications" },
      { label: "Settings", to: "/coordinator/m/$module", slug: "settings" },
      { label: "Activity", to: "/coordinator/m/$module", slug: "activity" },
    ],
  },
];

function CoordinatorLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = authService.getSession();
    if (!s || (s.user.role !== "coordinator" && s.user.role !== "super_admin")) {
      navigate({ to: "/login", replace: true });
    } else {
      setSession(s);
    }
  }, [navigate]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  const current = COORDINATOR_NAV.find((n) =>
    n.slug
      ? path.endsWith(`/m/${n.slug}`)
      : n.to === "/coordinator"
      ? path === "/coordinator" || path === "/coordinator/"
      : path.startsWith(n.to)
  );

  const signOut = () => {
    authService.signOut();
    navigate({ to: "/login" });
  };

  const collegeCode = session.user.collegeCode ?? "SMP101";

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar/80 backdrop-blur-xl transition-[width] duration-300 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-sidebar-border/60 px-4", collapsed && "justify-center px-0")}>
          {collapsed ? <span className="font-display text-xl">Z</span> : <Wordmark />}
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList collapsed={collapsed} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 border-t border-sidebar-border/60 p-4 text-xs text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="mx-auto h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>

      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-72 bg-sidebar/90 backdrop-blur-2xl p-0">
          <SheetTitle className="border-b border-sidebar-border/60 p-4">
            <Wordmark />
          </SheetTitle>
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
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <Link to="/coordinator" className="text-muted-foreground hover:text-foreground">
              Coordinator
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="truncate">{current?.label ?? "Overview"}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
              <Building2 className="h-3.5 w-3.5" /> Campus: {collegeCode}
            </span>

            <NotificationBell
              role="coordinator"
              collegeCode={collegeCode}
              align="end"
              manageLink="/coordinator/m/notifications"
              manageLabel="View campus announcements →"
            />

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline">{session.user.name ?? session.user.loginId}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.loginId}</p>
                  <p className="text-[10px] text-primary uppercase font-mono mt-0.5">Campus: {collegeCode}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Connected Operational Domains Strip */}
        <div className="border-b border-border/40 bg-card/40 px-4 py-2 backdrop-blur-md overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max text-xs">
            <span className="font-semibold text-muted-foreground mr-1 text-[11px] uppercase tracking-wider">
              Connected Hubs:
            </span>
            {WORKFLOW_HUBS.map((hub) => {
              const isHubActive = hub.items.some((item) =>
                item.slug
                  ? path.endsWith(`/m/${item.slug}`)
                  : path === item.to || path.startsWith(item.to + "/")
              );
              return (
                <div
                  key={hub.id}
                  className={cn(
                    "inline-flex items-center rounded-lg border p-0.5 transition-colors",
                    isHubActive
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border/50 bg-background/50 hover:bg-muted/40"
                  )}
                >
                  <span className="px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">
                    {hub.label}
                  </span>
                  <div className="flex items-center gap-0.5 pr-0.5">
                    {hub.items.map((item: any) => {
                      const active = item.slug
                        ? path.endsWith(`/m/${item.slug}`)
                        : path === item.to || path.startsWith(item.to + "/");
                      return item.slug ? (
                        <Link
                          key={item.label}
                          to="/coordinator/m/$module"
                          params={{ module: item.slug }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-foreground/80 hover:text-foreground hover:bg-muted/60"
                          )}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <Link
                          key={item.label}
                          to={item.to}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-foreground/80 hover:text-foreground hover:bg-muted/60"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
