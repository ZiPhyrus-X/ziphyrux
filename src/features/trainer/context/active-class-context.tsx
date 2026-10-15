import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api/client";

export interface TrainerAllocation {
  id: string;
  collegeId: string;
  collegeCode: string;
  academicYearId?: string;
  academicYearName?: string;
  semesterId?: string;
  semesterNumber?: number;
  branchId?: string;
  branchCode?: string;
  branchName?: string;
  sectionId?: string;
  sectionName?: string;
  classId?: string;
  className?: string;
  skillId?: string;
  skillName?: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "cancelled" | "upcoming";
}

export interface TrainerScopeData {
  trainer: {
    id: string;
    loginId: string;
    name: string;
    email: string;
    collegeCode: string;
    specialization?: string;
  };
  collegeCode: string;
  collegeName: string;
  authorizedSkills: string[];
  allocations: TrainerAllocation[];
}

interface ActiveClassContextType {
  scope: TrainerScopeData | null;
  allocations: TrainerAllocation[];
  activeAllocationId: string; // "all" or specific allocation ID
  activeAllocation: TrainerAllocation | null;
  setActiveAllocationId: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  refreshScope: () => Promise<void>;
  // Global modal state
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  isChangeClassOpen: boolean;
  setIsChangeClassOpen: (open: boolean) => void;
}

const ActiveClassContext = createContext<ActiveClassContextType | null>(null);

const STORAGE_KEY = "zx_trainer_active_allocation";

export function ActiveClassProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<TrainerScopeData | null>(null);
  const [activeAllocationId, setActiveAllocationIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "all";
    }
    return "all";
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isChangeClassOpen, setIsChangeClassOpen] = useState(false);

  const fetchScope = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.trainer.scope();
      setScope(data);

      // Verify that the active allocation ID is still valid in current allocations
      if (activeAllocationId !== "all" && data?.allocations) {
        const exists = data.allocations.some((a: TrainerAllocation) => a.id === activeAllocationId);
        if (!exists) {
          setActiveAllocationIdState("all");
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, "all");
          }
        }
      }
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(err?.message || "Failed to load trainer scope"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScope();
  }, []);

  const setActiveAllocationId = (id: string) => {
    setActiveAllocationIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const allocations = useMemo(() => scope?.allocations || [], [scope]);

  const activeAllocation = useMemo(() => {
    if (activeAllocationId === "all") return null;
    return allocations.find((a) => a.id === activeAllocationId) || null;
  }, [allocations, activeAllocationId]);

  return (
    <ActiveClassContext.Provider
      value={{
        scope,
        allocations,
        activeAllocationId,
        activeAllocation,
        setActiveAllocationId,
        isLoading,
        error,
        refreshScope: fetchScope,
        isSearchModalOpen,
        setIsSearchModalOpen,
        isChangeClassOpen,
        setIsChangeClassOpen,
      }}
    >
      {children}
    </ActiveClassContext.Provider>
  );
}

export function useActiveClassContext() {
  const ctx = useContext(ActiveClassContext);
  if (!ctx) {
    throw new Error("useActiveClassContext must be used within an ActiveClassProvider");
  }
  return ctx;
}
