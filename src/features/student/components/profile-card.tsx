import { useState } from "react";
import {
  Building2,
  GraduationCap,
  GitBranch,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Award,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudentProfileCardProps {
  student: {
    id: string;
    name: string;
    usn: string;
    email: string;
    department: string;
    program: string;
    year: string;
    semester: string;
    section: string;
    batch: string;
    collegeCode: string;
    githubUsername?: string;
    targetGitHubRepo?: string;
    bio?: string;
    stats?: {
      solvedProblems: number;
      completedAssessments: number;
      readinessScore: number;
    };
  };
  className?: string;
}

export function StudentProfileCard({ student, className }: StudentProfileCardProps) {
  const [copied, setCopied] = useState(false);

  const copyRepo = () => {
    if (!student.targetGitHubRepo) return;
    navigator.clipboard.writeText(student.targetGitHubRepo);
    setCopied(true);
    toast.success("Repository name copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={cn("rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-sm backdrop-blur-xl transition-all", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center text-xl font-bold font-mono text-primary select-none">
            {initials}
          </div>
          <span
            className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background"
            title="Active Student Account"
          />
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground truncate">{student.name}</h2>
            <Badge variant="outline" className="font-mono text-xs border-border bg-muted/40">
              {student.usn}
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
              Verified Student
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">{student.email}</p>

          <p className="text-xs text-foreground/85 mt-2 line-clamp-2">
            {student.bio || "Computer Science student building algorithms, solving systems problems, and mastering engineering competencies."}
          </p>
        </div>
      </div>

      {/* Target GitHub Repository Box (PART 14) */}
      {student.targetGitHubRepo && (
        <div className="mt-4 p-3 rounded-md border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Automated Solution Sync Repository
              </div>
              <div className="font-mono text-xs font-semibold text-foreground truncate">
                {student.targetGitHubRepo}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {student.githubUsername && (
              <a
                href={`https://github.com/${student.githubUsername}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded bg-muted/40 border border-border"
                title={`View @${student.githubUsername} on GitHub`}
              >
                <span>@{student.githubUsername}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 shrink-0 border-border"
              onClick={copyRepo}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Repo"}
            </Button>
          </div>
        </div>
      )}

      {/* Academic Meta Tags */}
      <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px]">Institution</span>
          <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            {student.collegeCode}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px]">Department</span>
          <span className="font-medium text-foreground truncate block mt-0.5" title={student.department}>
            {student.department}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px]">Academic Cohort</span>
          <span className="font-medium text-foreground block mt-0.5">
            {student.year} • {student.semester}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px]">Class Section</span>
          <span className="font-medium text-foreground block mt-0.5">
            {student.section}
          </span>
        </div>
      </div>

      {/* Quick Verified Evidence Badges */}
      {student.stats && (
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/40 border border-border/60 text-xs">
            <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-muted-foreground">Solved:</span>
            <strong className="text-foreground font-mono">{student.stats.solvedProblems}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/40 border border-border/60 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-muted-foreground">Assessments:</span>
            <strong className="text-foreground font-mono">{student.stats.completedAssessments}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/40 border border-border/60 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-muted-foreground">Readiness:</span>
            <strong className="text-foreground font-mono">{student.stats.readinessScore}%</strong>
          </div>
        </div>
      )}
    </div>
  );
}
