import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Code2,
  FileCheck2,
  BookOpen,
  TrendingUp,
  Sparkles,
  Target,
  Briefcase,
  Bell,
  Settings,
  LogOut,
  Menu,
  Shield,
  User,
  GitBranch,
  Terminal,
} from "lucide-react";
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
import { NotificationBell } from "@/components/notifications/notification-bell";
import { authService, type Session } from "@/lib/auth/service";
import { STUDENT_NAV } from "@/features/student/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentLayout,
});

function StudentLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = authService.getSession();
    if (!s || (s.user.role !== "student" && s.user.role !== "super_admin")) {
      navigate({ to: "/login", replace: true });
    } else {
      setSession(s);
    }
  }, [navigate]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground bg-background">
        Checking your student session…
      </div>
    );
  }

  const user = session.user;

  return (
    <div className={cn("bg-background text-foreground flex flex-col", path.startsWith("/student/judge") ? "h-screen overflow-hidden" : "min-h-screen")}>
      {/* GitHub-inspired Top Header */}
      <header className="sticky top-0 z-40 w-full shrink-0 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 text-muted-foreground"
              onClick={() => setMobile(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2.5">
              <Wordmark />
            </div>

            <span className="hidden sm:inline text-muted-foreground/40 font-mono text-sm select-none">/</span>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span className="font-semibold text-foreground">{user.collegeCode || "CAMPUS"}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground/90 truncate max-w-[140px]">{user.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell targetRole="student" collegeScope={user.collegeCode} />
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-border p-1 hover:border-foreground/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{user.loginId}</p>
                    <p className="text-[11px] text-muted-foreground">{user.collegeCode || "Ziphyrus Campus"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/student" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Student Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/student/m/$module" params={{ module: "settings" }} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings & Security</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => {
                    authService.signOut();
                    navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* GitHub-style Horizontal Tabs Navigation */}
        <div className="hidden md:flex overflow-x-auto px-4 sm:px-6 gap-1 border-t border-border/40 bg-background/40 backdrop-blur-md scrollbar-none">
          {STUDENT_NAV.map((item) => {
            const isExactOverview = item.to === "/student" && path === "/student";
            const isSubPath = item.slug
              ? path === `/student/m/${item.slug}`
              : item.to !== "/student" && path.startsWith(item.to);
            const isActive = isExactOverview || isSubPath;

            return item.slug ? (
              <Link
                key={item.label}
                to="/student/m/$module"
                params={{ module: item.slug }}
                className={cn(
                  "flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            ) : (
              <Link
                key={item.label}
                to={item.to as "/student"}
                className={cn(
                  "flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-72 p-0 bg-background/90 backdrop-blur-2xl border-border/60">
          <SheetTitle className="sr-only">Student Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b border-border px-4 gap-2">
            <Wordmark />
            <span className="text-xs font-mono text-muted-foreground">/ Student</span>
          </div>
          <nav className="flex flex-col gap-0.5 p-2" aria-label="Student Mobile Navigation">
            {STUDENT_NAV.map((n) => {
              const inner = (
                <>
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span>{n.label}</span>
                </>
              );
              const common =
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors";
              const active = { className: "bg-muted text-foreground font-semibold [&_svg]:text-primary" };

              return n.slug ? (
                <Link
                  key={n.label}
                  to="/student/m/$module"
                  params={{ module: n.slug }}
                  className={common}
                  activeProps={active}
                  onClick={() => setMobile(false)}
                >
                  {inner}
                </Link>
              ) : (
                <Link
                  key={n.label}
                  to={n.to as "/student"}
                  className={common}
                  activeProps={active}
                  activeOptions={{ exact: n.to === "/student" }}
                  onClick={() => setMobile(false)}
                >
                  {inner}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Workspace Body */}
      <main className={cn("flex-1 w-full", path.startsWith("/student/judge") ? "p-1.5 sm:p-2 flex flex-col min-h-0 overflow-hidden" : "max-w-7xl mx-auto p-4 sm:p-6")}>
        <Outlet />
      </main>

      {/* Developer footer */}
      {!path.startsWith("/student/judge") && (
        <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Ziphyrus X Employability Intelligence</span>
              <span>•</span>
              <span className="font-mono text-[11px]">Campus: {user.collegeCode || "SMP101"}</span>
            </div>
            <div className="text-[11px] text-muted-foreground/80 font-mono">
              Zero Attendance Engine — 100% Verified Evidence
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
