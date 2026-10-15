import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useActiveClassContext } from "../context/active-class-context";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, User, BookOpen, Code2, Award, AlertCircle, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchStudentModal() {
  const { isSearchModalOpen, setIsSearchModalOpen, activeAllocationId, activeAllocation } = useActiveClassContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!isSearchModalOpen) {
      setQuery("");
      setResults([]);
      setSelectedStudent(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.trainer.students({
          search: query.trim() || undefined,
          allocationId: activeAllocationId === "all" ? undefined : activeAllocationId,
          limit: 12,
        });
        setResults(res?.students || []);
      } catch (err) {
        console.error("Search student failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isSearchModalOpen, activeAllocationId]);

  const loadStudentDetail = async (studentId: string) => {
    setDetailLoading(true);
    try {
      const data = await api.trainer.studentDetail(studentId);
      setSelectedStudent(data);
    } catch (err) {
      console.error("Failed to load student detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
      <DialogContent className="max-w-3xl bg-background/95 backdrop-blur-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
        <div className="p-6 border-b border-border/60 bg-muted/20">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display text-2xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" /> Search Scoped Students
              </span>
              {activeAllocation && (
                <Badge variant="outline" className="text-xs font-normal">
                  Class: {activeAllocation.className || activeAllocation.branchCode}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Search by Student Name, USN, or Roll Number within your authorized teaching scope.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type student name or USN (e.g. Aditi, 1MS21CS001)..."
              className="pl-10 h-11 bg-background/70 border-border/80 focus-visible:ring-primary/40 rounded-lg text-sm"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {selectedStudent ? (
          <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudent(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back to search results
              </Button>
              <Badge variant="secondary" className="text-xs font-mono">
                Read-Only Scope
              </Badge>
            </div>

            {detailLoading ? (
              <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading comprehensive student analytics...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card/50">
                  <div className="space-y-1">
                    <h3 className="font-display text-xl text-foreground font-semibold">{selectedStudent.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">{selectedStudent.usn}</span>
                      <span>•</span>
                      <span>{selectedStudent.department || selectedStudent.degreeProgram}</span>
                      <span>•</span>
                      <span>Section {selectedStudent.section || "A"}</span>
                      <span>•</span>
                      <span>Year {selectedStudent.year || 3}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Placement: {selectedStudent.placementTier || "Tier 2"}
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Attendance: {selectedStudent.attendanceRate || 85}%
                    </Badge>
                  </div>
                </div>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border/40 bg-card/30 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Overall Score</span>
                    <p className="text-lg font-semibold text-foreground">{selectedStudent.overallScore || 78}%</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border/40 bg-card/30 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Coding Accuracy</span>
                    <p className="text-lg font-semibold text-foreground">{selectedStudent.codingAccuracy || 82}%</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border/40 bg-card/30 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Problems Solved</span>
                    <p className="text-lg font-semibold text-foreground">{selectedStudent.problemsSolved || 42}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border/40 bg-card/30 space-y-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Risk Status</span>
                    <p className="text-lg font-semibold text-foreground capitalize">{selectedStudent.riskCategory || "Low"}</p>
                  </div>
                </div>

                {/* Skill Mastery Breakdown */}
                {selectedStudent.skillMastery && Object.keys(selectedStudent.skillMastery).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill Breakdown</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(selectedStudent.skillMastery).map(([skill, score]: [string, any]) => (
                        <div key={skill} className="p-2.5 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground capitalize">{skill}</span>
                          <span className="font-mono text-muted-foreground">{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
            {results.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                {loading ? (
                  <span>Searching authorized students...</span>
                ) : (
                  <>
                    <p className="font-medium">No students found matching your query.</p>
                    <p className="text-xs">Verify the spelling or ensure the student belongs to your assigned class.</p>
                  </>
                )}
              </div>
            ) : (
              results.map((student) => (
                <div
                  key={student.id}
                  onClick={() => loadStudentDetail(student.id)}
                  className="group flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/30 hover:bg-card/70 hover:border-border transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {student.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {student.usn}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{student.department}</span>
                        <span>•</span>
                        <span>Sec {student.section}</span>
                        <span>•</span>
                        <span>Year {student.year}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-foreground">Score: {student.overallScore || 75}%</div>
                      <div className="text-[11px] text-muted-foreground">Coding: {student.codingAccuracy || 70}%</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
