import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FlaskConical,
  Layers,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { authService, type Session } from "@/lib/auth/service";
import { TRAINER_NAV } from "@/features/trainer/nav";
import {
  ActiveClassProvider,
  useActiveClassContext,
} from "@/features/trainer/context/active-class-context";
import { ChangeClassDialog } from "@/features/trainer/components/change-class-dialog";
import { SearchStudentModal } from "@/features/trainer/components/search-student-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trainer")({
  head: () => ({
    meta: [
      { title: "Trainer Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerRoot,
});

function TrainerRoot() {
  return (
    <ActiveClassProvider>
      <TrainerLayout />
      <ChangeClassDialog />
      <SearchStudentModal />
    </ActiveClassProvider>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="Trainer Navigation">
      {TRAINER_NAV.map((n) => {
        const common = cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center px-0"
        );
        const active = { className: "bg-sidebar-accent !text-sidebar-foreground font-medium [&_svg]:text-primary" };
        const inner = (
          <>
            <n.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{n.label}</span>}
          </>
        );

        return n.slug ? (
          <Link
            key={n.label}
            to="/trainer/m/$module"
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
            to={n.to as "/trainer"}
            className={common}
            activeProps={active}
            activeOptions={{ exact: n.to === "/trainer" }}
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

function TrainerLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const {
    scope,
    activeAllocation,
    activeAllocationId,
    setIsSearchModalOpen,
    setIsChangeClassOpen,
  } = useActiveClassContext();

  useEffect(() => {
    const s = authService.getSession();
    if (!s || (s.user.role !== "trainer" && s.user.role !== "super_admin")) {
      navigate({ to: "/login", replace: true });
    } else {
      setSession(s);
    }
  }, [navigate]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens Search Student modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSearchModalOpen]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Verifying trainer authorization…
      </div>
    );
  }

  const current = TRAINER_NAV.find((n) =>
    n.slug
      ? path.endsWith(`/m/${n.slug}`)
      : n.to === "/trainer"
      ? path === "/trainer" || path === "/trainer/"
      : path.startsWith(n.to)
  );

  const signOut = () => {
    authService.signOut();
    navigate({ to: "/login" });
  };

  const collegeName = scope?.collegeName || session.user.collegeCode || "Assigned Campus";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
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

      {/* Mobile Drawer */}
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-72 bg-sidebar/90 backdrop-blur-2xl p-0">
          <SheetTitle className="border-b border-sidebar-border/60 p-4">
            <Wordmark />
          </SheetTitle>
          <NavList onNavigate={() => setMobile(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {session.source === "dev-mock" && (
          <div className="flex items-center justify-center gap-2 border-b border-dashed border-warning/50 bg-warning/10 py-1.5 text-xs text-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-warning" /> Development preview — verified read-only trainer scope
          </div>
        )}

        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Open navigation">
            <Menu />
          </Button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex min-w-0 items-center gap-2 text-sm">
            <Link to="/trainer" className="text-muted-foreground hover:text-foreground font-medium">
              Trainer
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="truncate font-semibold text-foreground">{current?.label ?? "Dashboard"}</span>
          </nav>

          {/* Center/Left: Active Class Context Selector Bar */}
          <div className="flex items-center gap-2 max-w-full overflow-hidden">
            <div
              onClick={() => setIsChangeClassOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-card/50 hover:bg-card/90 hover:border-primary/40 cursor-pointer transition-all shadow-sm max-w-xs md:max-w-md"
              title="Click to switch active assigned class"
            >
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                  <span className="truncate">
                    {activeAllocation
                      ? activeAllocation.className || `${activeAllocation.branchCode} - Sec ${activeAllocation.sectionName || "A"}`
                      : "All Assigned Classes"}
                  </span>
                  {activeAllocation?.skillName && (
                    <span className="text-[10px] text-muted-foreground font-normal hidden lg:inline">
                      ({activeAllocation.skillName})
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {collegeName} • {activeAllocationId === "all" ? "Aggregated Scope" : "Active Allocation"}
                </div>
              </div>
              <Badge variant="outline" className="hidden xl:inline-flex text-[10px] font-normal py-0 h-4 border-border/80">
                Switch
              </Badge>
            </div>
          </div>

          {/* Right Action Icons & Profile */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Quick Search Student button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchModalOpen(true)}
              className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-border/70 bg-card/40 hover:bg-card/80 hover:text-foreground h-9 px-3 rounded-lg"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search Student</span>
              <kbd className="pointer-events-none text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchModalOpen(true)}
              className="md:hidden"
              aria-label="Search student"
            >
              <Search className="h-4 w-4" />
            </Button>

            <NotificationBell
              role="trainer"
              collegeCode={session.user.collegeCode}
              align="end"
              manageLink="/trainer/m/notifications"
              manageLabel="View institutional alerts →"
            />

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="hidden sm:inline font-medium text-xs text-foreground truncate max-w-[130px]">
                    {session.user.name || session.user.loginId}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-background/95 backdrop-blur-2xl border-border/80 shadow-2xl">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold text-foreground">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email || session.user.loginId}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                      Trainer
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                      {session.user.collegeCode || "SMP101"}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/trainer/m/$module" params={{ module: "account" }} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" /> Trainer Account & Scope
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
