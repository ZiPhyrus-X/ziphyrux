import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  School,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { EASE } from "@/animations/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search["token"] as string) || "",
      college:
        (search["college"] as string) ||
        (search["code"] as string) ||
        (search["collegeCode"] as string) ||
        "",
    };
  },
  head: () => ({
    meta: [
      { title: "Student Onboarding — Ziphyrus X Campus" },
      { name: "description", content: "Authoritative student campus registration for Ziphyrus X." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentRegistrationWizardPage,
});

function StudentRegistrationWizardPage() {
  const { token, college: queryCollege } = Route.useSearch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [verifiedToken, setVerifiedToken] = useState<any>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // College Code given by Ziphyrus-X state
  const [collegeCode, setCollegeCode] = useState(queryCollege ? queryCollege.trim().toUpperCase() : "");
  const [verifiedCollege, setVerifiedCollege] = useState<{ code: string; name: string; id?: string } | null>(null);
  const [verifyingCollege, setVerifyingCollege] = useState(false);
  const [collegeCodeError, setCollegeCodeError] = useState<string | null>(null);

  // Stepper state (1 to 4) - Note: Registration never asks for password
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completedStudent, setCompletedStudent] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Step 1: Personal Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: College & Academic
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [degreeProgram, setDegreeProgram] = useState("B.Tech");
  const [year, setYear] = useState("1st Year");
  const [section, setSection] = useState("Section A");

  // Step 3: USN Validation
  const [usn, setUsn] = useState("");

  // Step 4: Verification & Review
  const [acknowledged, setAcknowledged] = useState(false);

  // System generated password calculation: "Ziphyrus-x" + last 3 characters of USN
  const normalizedUsn = usn.trim().toUpperCase();
  const last3 = normalizedUsn.length >= 3 ? normalizedUsn.slice(-3) : normalizedUsn;
  const generatedPasswordPreview = normalizedUsn.length >= 3 ? `Ziphyrus-x${last3}` : "Ziphyrus-x***";

  // Verify token or college code on mount
  useEffect(() => {
    let active = true;

    async function initializeVerification() {
      if (token) {
        try {
          setVerifying(true);
          const res = await api.registration.verify(token, queryCollege || undefined);
          if (!active) return;
          if (res.valid && res.token) {
            setVerifiedToken(res);
            if (res.college) {
              setVerifiedCollege(res.college);
              setCollegeCode(res.college.code);
            }
            if (res.token.metadata?.department) {
              setDepartment(res.token.metadata.department);
            }
            if (res.token.metadata?.batch) {
              if (res.token.metadata.batch.includes("Section B")) setSection("Section B");
            }
          } else {
            setTokenError(res.error || "Invalid registration token.");
          }
        } catch (err: any) {
          if (active) {
            setTokenError(err?.message || "Failed to verify registration invitation link.");
          }
        } finally {
          if (active) setVerifying(false);
        }
        return;
      }

      // If no token is provided, check if query college code is supplied
      const initialCollege = (queryCollege || "").trim();
      if (initialCollege) {
        try {
          setVerifyingCollege(true);
          const res = await api.registration.verifyCollege(initialCollege);
          if (!active) return;
          if (res.valid && res.college) {
            setVerifiedCollege(res.college);
            setCollegeCode(res.college.code);
            setVerifiedToken({ valid: true, college: res.college });
          } else {
            setCollegeCodeError(res.error || "Invalid College Code given by Ziphyrus-X.");
          }
        } catch (err: any) {
          if (active) {
            setCollegeCodeError(err?.message || "Failed to verify College Code with Ziphyrus-X.");
          }
        } finally {
          if (active) {
            setVerifyingCollege(false);
            setVerifying(false);
          }
        }
        return;
      }

      // Direct registration without token or query college:
      // Ready to ask for College Code given by Ziphyrus-X in Step 1
      setVerifying(false);
    }

    initializeVerification();

    return () => {
      active = false;
    };
  }, [token, queryCollege]);

  // College Code verification handler
  const handleVerifyCollegeCode = async (overrideCode?: string) => {
    const codeToVerify = (overrideCode ?? collegeCode).trim().toUpperCase();
    if (!codeToVerify) {
      setCollegeCodeError("Please enter the College Code given by Ziphyrus-X.");
      setVerifiedCollege(null);
      return false;
    }

    setVerifyingCollege(true);
    setCollegeCodeError(null);
    try {
      const res = await api.registration.verifyCollege(codeToVerify);
      if (res.valid && res.college) {
        setVerifiedCollege(res.college);
        setCollegeCode(res.college.code);
        setVerifiedToken({ valid: true, college: res.college });
        toast.success(`Verified: ${res.college.name} (${res.college.code})`);
        return true;
      } else {
        setVerifiedCollege(null);
        const msg = res.error || `College Code '${codeToVerify}' is not recognized by Ziphyrus-X.`;
        setCollegeCodeError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err: any) {
      setVerifiedCollege(null);
      const msg = err?.message || "Failed to verify College Code with Ziphyrus-X.";
      setCollegeCodeError(msg);
      toast.error(msg);
      return false;
    } finally {
      setVerifyingCollege(false);
    }
  };

  // Validation per step
  const isCollegeVerified = Boolean(verifiedCollege?.code);
  const canProceedStep1 =
    isCollegeVerified &&
    name.trim().length >= 2 &&
    email.trim().includes("@") &&
    email.trim().includes(".");
  const canProceedStep2 = Boolean(department && degreeProgram && year && section);
  const canProceedStep3 = usn.trim().length >= 5;
  const canProceedStep4 = acknowledged && isCollegeVerified;

  const handleNext = async () => {
    if (step === 1) {
      if (!isCollegeVerified) {
        if (collegeCode.trim()) {
          const verified = await handleVerifyCollegeCode();
          if (!verified) return;
        } else {
          toast.error("Please enter and verify the College Code given by Ziphyrus-X.");
          return;
        }
      }
      if (!name.trim() || name.trim().length < 2) {
        toast.error("Please enter your full name as per college ID.");
        return;
      }
      if (!email.trim() || !email.includes("@") || !email.includes(".")) {
        toast.error("Please enter a valid institutional email address.");
        return;
      }
    }
    if (step === 2 && !canProceedStep2) {
      toast.error("Please select all required academic fields.");
      return;
    }
    if (step === 3 && !canProceedStep3) {
      toast.error("Please enter a valid University Seat Number (USN) of at least 5 characters.");
      return;
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCompleteRegistration = async () => {
    if (!canProceedStep4) {
      toast.error("Please acknowledge the campus enrollment declaration.");
      return;
    }

    setSubmitting(true);
    try {
      const activeCollegeCode = (verifiedCollege?.code || collegeCode).trim().toUpperCase();
      const res = await api.registration.complete({
        token: token || undefined,
        collegeCode: activeCollegeCode,
        student: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department,
          degreeProgram,
          section,
          year,
          usn: normalizedUsn,
        },
      });

      if (res.success && res.student) {
        const studentLast3 = res.student.usn?.slice(-3) || normalizedUsn.slice(-3);
        const finalGeneratedPassword = res.generatedPassword || `Ziphyrus-x${studentLast3}`;
        setCompletedStudent({
          ...res.student,
          generatedPassword: finalGeneratedPassword,
        });
        toast.success("Registration completed successfully! Welcome to Ziphyrus X.");
      } else {
        toast.error("Failed to complete campus registration.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Registration failed. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: "id" | "password") => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
      toast.success(`Copied ${type === "id" ? "Login ID" : "Password"} to clipboard!`);
    }
  };

  // 1. Loading Verification Screen
  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="font-medium text-sm">Verifying institutional authorization…</p>
          <p className="text-xs text-muted-foreground">Validating campus jurisdiction with Ziphyrus-X authoritative records.</p>
        </div>
      </div>
    );
  }

  // 2. Token Error / Expired / Revoked Screen
  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="w-full max-w-md p-8 rounded-2xl border border-border/70 bg-card/75 shadow-2xl backdrop-blur-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Invalid Registration Link</h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {tokenError || "This registration link is not valid or has already expired."}
            </p>
          </div>

          <div className="p-3 rounded bg-muted/40 border border-border/60 text-xs text-muted-foreground text-left space-y-1.5 font-mono">
            <p>• Registration links expire automatically 1 hour after generation.</p>
            <p>• Each link can be used by only one student and cannot be reused.</p>
            <p>• Links may be revoked by the campus coordinator if invalidated.</p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => {
                setTokenError(null);
                setVerifiedToken(null);
                setStep(1);
              }}
              className="w-full font-semibold shadow-md"
            >
              <Building2 className="w-4 h-4 mr-1.5" />
              Register with College Code given by Ziphyrus-X
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/login" })} className="w-full">
              Proceed to Sign In
            </Button>
            <p className="text-[11px] text-muted-foreground">
              You can also contact your college Ziphyrus X Coordinator to receive a fresh registration link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Registration Success Screen
  if (completedStudent) {
    const studentLast3 = completedStudent.usn?.slice(-3) || "000";
    const studentPassword = completedStudent.generatedPassword || `Ziphyrus-x${studentLast3}`;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-xl p-8 rounded-2xl border border-border/70 bg-card/75 shadow-2xl backdrop-blur-2xl space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 mb-2 font-mono">
              Campus Enrollment Complete
            </Badge>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Welcome to Ziphyrus X, {completedStudent.name}!
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Your student account has been created in the authoritative database for {completedStudent.collegeName} ({completedStudent.collegeCode}).
            </p>
          </div>

          {/* System Generated Credentials Card */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-left space-y-3 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-primary/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                Your Official Login Credentials
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">Save for sign-in</span>
            </div>

            {/* Login ID / USN */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-border/60">
              <div>
                <p className="text-[11px] text-muted-foreground">Login ID (Your USN)</p>
                <p className="font-mono font-bold text-sm text-foreground">{completedStudent.usn}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-mono"
                onClick={() => copyToClipboard(completedStudent.usn, "id")}
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedId ? "Copied" : "Copy"}
              </Button>
            </div>

            {/* System Generated Password */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-border/60">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] text-muted-foreground">System-Generated Password</p>
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-mono">
                    Ziphyrus-x+{studentLast3}
                  </span>
                </div>
                <p className="font-mono font-bold text-sm text-foreground">{studentPassword}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-mono"
                onClick={() => copyToClipboard(studentPassword, "password")}
              >
                {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedPassword ? "Copied" : "Copy"}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              • The registration form never asks for a password. Your initial login password is automatically generated as <strong className="text-foreground font-mono">Ziphyrus-x</strong> followed by the last 3 characters of your USN.
            </p>
          </div>

          {/* Fresh Start State Summary */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-xs font-mono text-left space-y-2">
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-sans">Initial Readiness Score:</span>
              <span className="font-bold text-foreground">0% (Fresh Start Baseline)</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-sans">Coding Problems Solved:</span>
              <span className="text-foreground">0 / 0 Submissions</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-sans">Department & Section:</span>
              <span className="text-foreground">{completedStudent.department} · {completedStudent.section}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Institutional Scope:</span>
              <span className="text-primary font-bold">{completedStudent.collegeCode} (Verified by Ziphyrus-X)</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              onClick={() => navigate({ to: "/login" })}
              className="w-full font-semibold shadow-lg"
            >
              Sign In to Student Workspace
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Sign in with your Login ID (<code className="font-mono text-foreground">{completedStudent.usn}</code>) and your generated password (<code className="font-mono text-foreground">{studentPassword}</code>).
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const campus = verifiedCollege || verifiedToken?.college || {
    name: "Campus Pending Verification",
    code: collegeCode || "Pending",
    id: "",
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-background">
      {/* ---------------------------------------------------------------------- */}
      {/* LEFT COLUMN: Campus & Stepper Overview                                 */}
      {/* ---------------------------------------------------------------------- */}
      <aside className="relative hidden lg:flex lg:col-span-4 flex-col justify-between border-r border-border/60 bg-surface/75 backdrop-blur-2xl p-10 overflow-y-auto">
        <div>
          <Wordmark />
          <div className="mt-8">
            <Badge className="bg-primary/10 text-primary border-primary/30 font-mono text-xs mb-3">
              Campus Admission
            </Badge>
            <h1 className="font-display text-4xl text-foreground leading-[1.05]">
              Begin your journey as <em className="text-accent font-serif">evidence.</em>
            </h1>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Complete your authoritative registration for {campus?.name || "your campus"} ({campus?.code}).
            </p>
          </div>

          {/* Stepper Progress Visualizer (4 Clean Steps) */}
          <div className="mt-8 space-y-3 font-mono text-xs">
            {[
              { num: 1, title: "Campus & Identity", desc: "College Code & personal details" },
              { num: 2, title: "Academic Information", desc: "Department & degree program" },
              { num: 3, title: "USN Validation", desc: "University Seat Number" },
              { num: 4, title: "Campus Verification", desc: "Fresh-start review & enrollment" },
            ].map((s) => (
              <div
                key={s.num}
                className={cn(
                  "p-3 rounded-lg border transition-all flex items-start gap-3",
                  step === s.num
                    ? "border-primary bg-primary/5 text-foreground shadow-xs"
                    : step > s.num
                    ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                    : "border-border/60 bg-muted/10 text-muted-foreground/60"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5",
                    step === s.num
                      ? "bg-primary text-primary-foreground"
                      : step > s.num
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-xs">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground font-sans mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 text-[11px] text-muted-foreground font-mono space-y-1">
          <p>College Code (Ziphyrus-X): <strong className="text-primary">{campus?.code || "Pending Verification"}</strong></p>
          <p>Institutional Scope: {isCollegeVerified ? "Active · Verified by Ziphyrus-X" : "Code Verification Pending"}</p>
          <p className="text-muted-foreground/80 font-sans">
            Password Policy: System generated automatically ("Ziphyrus-x" + last 3 of USN).
          </p>
        </div>
      </aside>

      {/* ---------------------------------------------------------------------- */}
      {/* RIGHT COLUMN: Wizard Steps Form                                        */}
      {/* ---------------------------------------------------------------------- */}
      <main className="lg:col-span-8 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto">
        <div className="flex items-center justify-between pb-6 border-b border-border/40">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Step {step} of 4
            </Badge>
            <span className="text-xs text-muted-foreground font-sans">
              {step === 1 && "Campus & Identity Details"}
              {step === 2 && "Academic Details"}
              {step === 3 && "University Seat Number"}
              {step === 4 && "Review & Complete"}
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="my-auto py-8 max-w-xl w-full mx-auto">
          {/* STEP 1: Personal Details & College Code */}
          {step === 1 && (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <p className="eyebrow text-primary">Step 1 · Campus & Identity</p>
                <h2 className="font-display text-3xl font-bold mt-1">Campus & Personal Details</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Provide your official College Code given by Ziphyrus-X and student identity details.
                </p>
              </div>

              <div className="space-y-4">
                {/* Institutional College Code Given by Ziphyrus-X Section */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reg-college-code" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary" />
                      College Code given by Ziphyrus-X <span className="text-rose-500">*</span>
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      Required
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <School className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-college-code"
                        placeholder="e.g. SMP101"
                        value={collegeCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCollegeCode(val);
                          setCollegeCodeError(null);
                          if (verifiedCollege && verifiedCollege.code !== val) {
                            setVerifiedCollege(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVerifyCollegeCode();
                          }
                        }}
                        className="pl-9 font-mono uppercase tracking-wider font-semibold text-xs"
                        autoFocus={!queryCollege && !token}
                      />
                    </div>
                    <Button
                      type="button"
                      variant={isCollegeVerified ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleVerifyCollegeCode()}
                      disabled={verifyingCollege || !collegeCode.trim()}
                      className="font-medium text-xs shrink-0"
                    >
                      {verifyingCollege ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Checking…
                        </>
                      ) : isCollegeVerified ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                          Verified
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Verify Code
                        </>
                      )}
                    </Button>
                  </div>

                  {collegeCodeError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{collegeCodeError}</span>
                    </div>
                  )}

                  {isCollegeVerified && verifiedCollege && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Verified Campus
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                          {verifiedCollege.code}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground">{verifiedCollege.name}</p>
                      <p className="text-[11px] text-muted-foreground font-sans">
                        Authoritative campus verified with Ziphyrus-X. Your student account will be enrolled under this institution.
                      </p>
                    </div>
                  )}

                  {!isCollegeVerified && !collegeCodeError && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Enter the institutional code provided to you by Ziphyrus-X (e.g., <code className="font-mono text-foreground font-bold">SMP101</code>, <code className="font-mono text-foreground font-bold">SMP102</code>, or <code className="font-mono text-foreground font-bold">SMP105</code>) to connect with your college's training and placement portal.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-xs font-semibold">
                    Full Name (as per college ID) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      placeholder="e.g. Varun Kulkarni"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-xs font-semibold">
                    Institutional / Registered Email <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder={verifiedCollege ? `e.g. student@${verifiedCollege.code.toLowerCase()}.edu` : "e.g. student@campus.edu"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This email will be bound to your institutional student account for assessment reports and drive notifications.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone" className="text-xs font-semibold">
                    Mobile Number (Optional)
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-phone"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Academic Information */}
          {step === 2 && (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <p className="eyebrow text-primary">Step 2 · Academic Enrollment</p>
                <h2 className="font-display text-3xl font-bold mt-1">Academic Program & Batch</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Select your department, graduation degree, academic year, and section.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-primary" />
                    <div className="text-xs">
                      <span className="font-semibold text-foreground font-sans block">{campus?.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        College Code (Ziphyrus-X): <strong className="text-primary">{campus?.code}</strong>
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">
                    Verified Campus
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Department <span className="text-rose-500">*</span></Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="Computer Science & Engineering">Computer Science & Engineering</SelectItem>
                      <SelectItem value="Information Science">Information Science</SelectItem>
                      <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                      <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      <SelectItem value="Artificial Intelligence & Machine Learning">Artificial Intelligence & Machine Learning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Degree Program</Label>
                    <Select value={degreeProgram} onValueChange={setDegreeProgram}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Degree" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="B.Tech">B.Tech</SelectItem>
                        <SelectItem value="B.E.">B.E.</SelectItem>
                        <SelectItem value="M.Tech">M.Tech</SelectItem>
                        <SelectItem value="BCA">BCA</SelectItem>
                        <SelectItem value="MCA">MCA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Academic Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Section</Label>
                    <Select value={section} onValueChange={setSection}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Section A">Section A</SelectItem>
                        <SelectItem value="Section B">Section B</SelectItem>
                        <SelectItem value="Section C">Section C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: USN Validation & Password Formula Preview */}
          {step === 3 && (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <p className="eyebrow text-primary">Step 3 · Identity Verification</p>
                <h2 className="font-display text-3xl font-bold mt-1">University Seat Number (USN)</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your official university seat number, roll number, or permanent student registration ID.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-usn" className="text-xs font-semibold">
                    Permanent USN / Roll Number <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-usn"
                      placeholder="e.g. 1MS24CS891"
                      value={usn}
                      onChange={(e) => setUsn(e.target.value.toUpperCase())}
                      className="pl-9 text-xs font-mono uppercase"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This USN will serve as your primary platform login ID across all platform roles and modules.
                  </p>
                </div>

                {/* System Generated Password Policy Callout */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4" />
                      System-Generated Student Password
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                      Invariant
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The registration form <strong>never asks for a password</strong>. Your platform login password is automatically generated by the system using the official standard formula:
                  </p>

                  <div className="p-3 rounded-lg bg-card/80 border border-border/60 flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground">Formula:</span>
                    <span className="font-bold text-foreground">
                      "Ziphyrus-x" + (last 3 characters of USN)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-card/80 border border-border/60 flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground">Your Generated Password:</span>
                    <span className="font-bold text-primary">
                      {generatedPasswordPreview}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    You will be able to sign in immediately upon finishing registration using your USN and this generated password.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Campus USN Invariants:</p>
                  <p>• Must be unique across all students registered at {campus?.name}.</p>
                  <p>• Cannot be modified by students post-registration without coordinator authorization.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Review & Campus Verification */}
          {step === 4 && (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <p className="eyebrow text-primary">Step 4 · Verification</p>
                <h2 className="font-display text-3xl font-bold mt-1">Campus Verification & Review</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Verify your registration details before final enrollment submission into the database.
                </p>
              </div>

              {/* Review Summary Card */}
              <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3 text-xs shadow-xs">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="font-semibold text-foreground">{name}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Official Email:</span>
                  <span className="font-mono text-foreground">{email}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">College Code (Ziphyrus-X):</span>
                  <span className="font-mono font-bold text-primary">{campus?.code}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Authoritative Campus:</span>
                  <span className="font-semibold text-foreground">{campus?.name}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">USN / Roll Number:</span>
                  <span className="font-mono font-bold text-primary">{normalizedUsn}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="text-foreground">{department}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Degree, Year & Section:</span>
                  <span className="text-foreground">{degreeProgram} · {year} · {section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-Generated Password:</span>
                  <span className="font-mono font-bold text-primary">{generatedPasswordPreview}</span>
                </div>
              </div>

              {/* Fresh Start Notice */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  Fresh Start Profile Activation
                </p>
                <p className="text-[11px] leading-relaxed">
                  Upon registration, your account will be automatically created with a clean slate: readiness score initialized to <strong>0%</strong>, 0 coding problems solved, and an empty assessment record. Placement officers, trainers, coordinators, editors, and super admins will immediately be able to find and track your progress in real time.
                </p>
              </div>

              {/* Locked Invariant Notice */}
              <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Portfolio Integration Policy
                </p>
                <p className="text-[11px] leading-relaxed">
                  LeetCode, GitHub, and professional coding profiles belong strictly in the post-login student portfolio. You will be able to synchronize your accounts immediately after signing in.
                </p>
              </div>

              {/* Acknowledgment Checkbox */}
              <div className="flex items-start gap-2.5 pt-2">
                <Checkbox
                  id="reg-ack"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(Boolean(checked))}
                  className="mt-0.5"
                />
                <label htmlFor="reg-ack" className="text-xs text-muted-foreground leading-normal cursor-pointer select-none">
                  I hereby confirm that all personal and academic details provided match my official institutional records at {campus?.name} ({campus?.code}).
                </label>
              </div>
            </motion.div>
          )}

          {/* Navigation Controls */}
          <div className="pt-8 border-t border-border/40 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={submitting}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Step
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button size="sm" onClick={handleNext}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCompleteRegistration}
                disabled={!canProceedStep4 || submitting}
                className="font-semibold bg-primary text-primary-foreground shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Enrolling Student…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Complete Campus Registration
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
