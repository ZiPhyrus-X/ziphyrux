import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, Eye, EyeOff, FlaskConical, Loader2 } from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AUTH_MODE, AuthError, DEV_MOCK_HINT, authService, homeForRole } from "@/lib/auth/service";
import { EASE } from "@/animations/motion";
import { LOOP } from "@/data/site";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Ziphyrus X ClassRoom" },
      { name: "description", content: "Sign in to Ziphyrus X with your registered ID." },
      { property: "og:title", content: "Sign in — Ziphyrus X ClassRoom" },
      { property: "og:description", content: "Sign in to the Ziphyrus X employability intelligence platform." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  loginId: z.string().trim().min(3, "Enter your login ID or registered ID").max(80),
  password: z.string().min(1, "Enter your password").max(128),
  remember: z.boolean(),
});
type Values = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { loginId: "", password: "", remember: false },
  });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      const s = await authService.signIn(v.loginId, v.password, v.remember);
      const dest = homeForRole(s.user.role);
      if (!dest) {
        authService.signOut();
        setError("Your workspace isn't available yet.");
        return;
      }
      setStatus("success");
      setTimeout(() => navigate({ to: dest }), 600);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-12 lg:flex">
        <Wordmark />
        <div>
          <p className="eyebrow text-accent">ClassRoom</p>
          <h1 className="mt-6 font-display text-[clamp(3rem,5vw,5rem)] leading-[0.95]">
            Every session <br /> becomes <em className="text-accent">evidence.</em>
          </h1>
          <p className="mt-6 max-w-sm text-muted-foreground">Sign in to continue to your Ziphyrus X workspace.</p>
        </div>
        <ol className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground">
          {LOOP.map((l, i) => (
            <motion.li key={l.k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.4 + i * 0.12 }}>
              {l.k}{i < LOOP.length - 1 && <span className="ml-4 text-accent">→</span>}
            </motion.li>
          ))}
        </ol>
      </aside>

      <main className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Wordmark className="lg:invisible" />
          <ThemeToggle />
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="m-auto w-full max-w-sm py-12"
        >
          <h2 className="font-display text-5xl">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use the login ID issued by your institution or platform administrator.</p>

          {AUTH_MODE === "dev-mock" && (
            <div className="mt-6 flex gap-3 border border-dashed border-warning/60 p-3 text-xs text-muted-foreground" role="note">
              <FlaskConical className="h-4 w-4 shrink-0 text-warning" />
              <p>
                <strong className="text-foreground">Development preview.</strong> Sign-in is simulated and not connected to a real backend.
                Use <code className="font-mono text-foreground">dev.superadmin</code>, <code className="font-mono text-foreground">dev.editor</code> or <code className="font-mono text-foreground">dev.coordinator</code> with password <code className="font-mono text-foreground">{DEV_MOCK_HINT.password}</code>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="loginId">Login ID or registered ID</Label>
              <Input id="loginId" autoComplete="username" aria-invalid={!!errors.loginId} aria-describedby="loginId-err" className="h-11" {...register("loginId")} />
              {errors.loginId && <p id="loginId-err" className="text-xs text-destructive">{errors.loginId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby="password-err" className="h-11 pr-11" {...register("password")} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p id="password-err" className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={watch("remember")} onCheckedChange={(c) => setValue("remember", c === true)} />
              Keep me signed in on this device
            </label>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex gap-2 border border-destructive/50 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </motion.div>
            )}

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isSubmitting || status === "success"}>
              {status === "success" ? <><Check /> Signed in</> : isSubmitting ? <><Loader2 className="animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Forgot your password? Contact your institution's administrator.</p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
