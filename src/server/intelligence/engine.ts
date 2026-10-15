/**
 * Ziphyrus X — Source of Truth & Intelligence Engine
 * Enforces the Four Logical Data Layers:
 * - Layer A: Authoritative Source of Truth (Verified records)
 * - Layer B: Authoritative Intelligence (Pure evidence calculations)
 * - Layer C: Adjusted Reporting Intelligence (Editor-authorized overrides + dependency recalculation)
 * - Layer D: Audit and Provenance Ledger (Super Admin oversight)
 */

import { METRIC_REGISTRY, type MetricScope } from "./metric-registry";
import type { StudentIntelligenceProfile, OverrideRecord } from "../db";

export interface IntelligenceMetadata {
  calculationVersion: string;
  calculatedAt: string;
  freshness: "fresh" | "recalculated" | "stale";
  status: "computed" | "pending";
  scope: MetricScope;
  scopeId: string;
  layer: "authoritative" | "adjusted";
  evidenceSampleCount: number;
  totalPopulationCount: number;
  appliedOverridesCount: number;
}

export interface ScopeIntelligenceResult {
  scope: MetricScope;
  scopeId: string;
  metadata: IntelligenceMetadata;
  metrics: {
    averageReadiness: number;
    technicalAvg: number | null;
    aptitudeAvg: number | null;
    verbalAvg: number | null;
    softSkillsAvg: number | null;
    codingAvg: number | null;
    totalStudents: number;
    readinessBands: {
      high: number;
      medium: number;
      needsAttention: number;
    };
    [key: string]: any;
  };
  childrenBreakdown?: any[];
  reconciliation?: {
    hasDivergence: boolean;
    authoritativeReadiness: number;
    adjustedReadiness: number;
    delta: number;
    affectedOverrides: OverrideRecord[];
  };
}

export interface OverrideProvenanceRecord {
  id: string;
  overrideId: string;
  entityType: string;
  targetType?: string;
  entityId: string;
  targetId?: string;
  fieldName: string;
  metricKey?: string;
  authoritativeValue: string | number;
  originalValue?: string | number;
  visibleValue: string | number;
  adjustedValue?: string | number;
  delta: number | string;
  editorId: string;
  editorLogin?: string;
  mandatoryReason: string;
  affectedScopes: string[];
  recalculationVersion: string;
  calculationVersion?: string;
  recalculatedAt: string;
}

export class IntelligenceEngine {
  private calculationVersion = "v2.6-engine";
  private provenanceLedger: OverrideProvenanceRecord[] = [];

  /**
   * Helper: Resolves value for a student field, applying Layer C override if requested.
   */
  public resolveStudentMetric(
    student: StudentIntelligenceProfile,
    fieldName: "readiness_score" | "technical" | "aptitude" | "verbal" | "soft_skills",
    layer: "authoritative" | "adjusted",
    overrides: OverrideRecord[]
  ): number | null {
    if (layer === "authoritative") {
      if (fieldName === "readiness_score") return student.readinessScore;
      if (fieldName === "technical") return student.skills.technical;
      if (fieldName === "aptitude") return student.skills.aptitude;
      if (fieldName === "verbal") return student.skills.verbal;
      if (fieldName === "soft_skills") return student.skills.softSkills;
      return null;
    }

    // Layer C: Check for active visible-value override
    const activeOverride = overrides.find(
      (o) =>
        (!o.effectiveStatus || o.effectiveStatus === "active") &&
        o.entityType.toLowerCase() === "student" &&
        o.entityId === student.studentId &&
        (o.fieldName === fieldName ||
          o.metricId === fieldName ||
          (fieldName === "readiness_score" &&
            (o.fieldName === "readinessScore" || o.fieldName === "readiness" || o.metricId === "met_readiness_score")) ||
          (fieldName === "technical" &&
            (o.fieldName === "technicalCompetency" || o.metricId === "met_technical_competency")) ||
          (fieldName === "aptitude" &&
            (o.fieldName === "aptitudeCompetency" || o.metricId === "met_aptitude_competency")) ||
          (fieldName === "verbal" &&
            (o.fieldName === "verbalCompetency" || o.metricId === "met_verbal_competency")) ||
          (fieldName === "soft_skills" &&
            (o.fieldName === "softSkills" || o.fieldName === "softSkillsCompetency" || o.metricId === "met_soft_skills_competency")))
    );

    if (activeOverride) {
      const num = Number(activeOverride.visibleValue);
      return isNaN(num) ? student.readinessScore : num;
    }

    // Default to authoritative if no override
    return this.resolveStudentMetric(student, fieldName, "authoritative", overrides);
  }

  /**
   * Calculates scope intelligence for a population of students.
   * Invariant: Missing evidence is NOT treated as zero.
   */
  public computePopulationMetrics(
    students: StudentIntelligenceProfile[],
    layer: "authoritative" | "adjusted",
    overrides: OverrideRecord[],
    directScopeOverride?: OverrideRecord
  ) {
    const totalStudents = students.length;

    // Resolve student values with or without Layer C overrides
    const readinessValues = students.map((s) => this.resolveStudentMetric(s, "readiness_score", layer, overrides)!);

    // Missing data rule: null is preserved, not treated as 0
    const techValues = students
      .map((s) => this.resolveStudentMetric(s, "technical", layer, overrides))
      .filter((v): v is number => v !== null);

    const aptValues = students
      .map((s) => this.resolveStudentMetric(s, "aptitude", layer, overrides))
      .filter((v): v is number => v !== null);

    const vrbValues = students
      .map((s) => this.resolveStudentMetric(s, "verbal", layer, overrides))
      .filter((v): v is number => v !== null);

    const softValues = students
      .map((s) => this.resolveStudentMetric(s, "soft_skills", layer, overrides))
      .filter((v): v is number => v !== null);

    // Coding Judge score is immutable verified evidence
    const codingScores = students.map((s) => s.coding.score);

    // Calculated population average readiness
    let childDerivedAvgReadiness = totalStudents
      ? Math.round(readinessValues.reduce((a, b) => a + b, 0) / totalStudents)
      : 0;

    let finalAvgReadiness = childDerivedAvgReadiness;

    // Precedence rule: If a direct aggregate override exists for this exact scope, apply it for Layer C
    if (
      layer === "adjusted" &&
      directScopeOverride &&
      (!directScopeOverride.effectiveStatus || directScopeOverride.effectiveStatus === "active")
    ) {
      const directVal = Number(directScopeOverride.visibleValue);
      if (!isNaN(directVal)) {
        finalAvgReadiness = directVal;
      }
    }

    // Readiness Bands based on resolved readiness values
    const highCount = readinessValues.filter((r) => r >= 75).length;
    const medCount = readinessValues.filter((r) => r >= 60 && r < 75).length;
    const lowCount = readinessValues.filter((r) => r < 60).length;

    return {
      averageReadiness: finalAvgReadiness,
      childDerivedAvgReadiness,
      technicalAvg: techValues.length ? Math.round(techValues.reduce((a, b) => a + b, 0) / techValues.length) : null,
      aptitudeAvg: aptValues.length ? Math.round(aptValues.reduce((a, b) => a + b, 0) / aptValues.length) : null,
      verbalAvg: vrbValues.length ? Math.round(vrbValues.reduce((a, b) => a + b, 0) / vrbValues.length) : null,
      softSkillsAvg: softValues.length ? Math.round(softValues.reduce((a, b) => a + b, 0) / softValues.length) : null,
      codingAvg: codingScores.length ? Math.round(codingScores.reduce((a, b) => a + b, 0) / codingScores.length) : 0,
      totalStudents,
      readinessBands: {
        high: highCount,
        medium: medCount,
        needsAttention: lowCount,
      },
    };
  }

  /**
   * Tracks calculation dependencies and creates a provenance record when an override is modified.
   */
  public recordOverrideRecalculation(
    override: OverrideRecord,
    affectedScopes: string[],
    authoritativeValue: string | number,
    visibleValue: string | number
  ): OverrideProvenanceRecord {
    const provRecord: OverrideProvenanceRecord = {
      id: `prov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      overrideId: override.id,
      entityType: override.entityType,
      targetType: override.entityType,
      entityId: override.entityId,
      targetId: override.entityId,
      fieldName: override.fieldName,
      metricKey: override.fieldName,
      authoritativeValue,
      originalValue: authoritativeValue,
      visibleValue,
      adjustedValue: visibleValue,
      delta:
        typeof authoritativeValue === "number" && typeof visibleValue === "number"
          ? Number((visibleValue - authoritativeValue).toFixed(2))
          : `${authoritativeValue} → ${visibleValue}`,
      editorId: override.overriddenBy,
      editorLogin: override.overriddenBy,
      mandatoryReason: override.mandatoryReason,
      affectedScopes,
      recalculationVersion: this.calculationVersion,
      calculationVersion: this.calculationVersion,
      recalculatedAt: new Date().toISOString(),
    };

    this.provenanceLedger.unshift(provRecord);
    return provRecord;
  }

  public getProvenanceLedger(): OverrideProvenanceRecord[] {
    return [...this.provenanceLedger];
  }

  /**
   * Builds side-by-side reconciliation between Authoritative (Layer B) and Adjusted (Layer C)
   * for a given scope. Exclusively exposed to Super Admin.
   */
  public buildReconciliation(
    scope: MetricScope,
    scopeId: string,
    authoritativeMetrics: any,
    adjustedMetrics: any,
    relevantOverrides: OverrideRecord[]
  ) {
    const delta = (adjustedMetrics?.averageReadiness ?? 0) - (authoritativeMetrics?.averageReadiness ?? 0);
    return {
      scope,
      scopeId,
      hasDivergence: delta !== 0 || relevantOverrides.length > 0,
      authoritativeReadiness: authoritativeMetrics?.averageReadiness ?? null,
      adjustedReadiness: adjustedMetrics?.averageReadiness ?? null,
      delta,
      relevantOverridesCount: relevantOverrides.length,
      relevantOverrides: relevantOverrides.map((o) => ({
        id: o.id,
        entityType: o.entityType,
        entityId: o.entityId,
        fieldName: o.fieldName,
        actualValue: o.actualValue,
        visibleValue: o.visibleValue,
        mandatoryReason: o.mandatoryReason,
        overriddenBy: o.overriddenBy,
        createdAt: o.createdAt,
      })),
      calculationVersion: this.calculationVersion,
      recalculationVersion: this.calculationVersion,
      reconciledAt: new Date().toISOString(),
      comparison: {
        readinessScore: {
          authoritative: authoritativeMetrics?.averageReadiness ?? null,
          adjusted: adjustedMetrics?.averageReadiness ?? null,
          delta: delta,
          hasOverride: delta !== 0 || relevantOverrides.length > 0,
        },
        technicalCompetency: {
          authoritative: authoritativeMetrics?.technicalAvg ?? null,
          adjusted: adjustedMetrics?.technicalAvg ?? null,
          delta: (adjustedMetrics?.technicalAvg ?? 0) - (authoritativeMetrics?.technicalAvg ?? 0),
          hasOverride: false,
        },
        aptitudeCompetency: {
          authoritative: authoritativeMetrics?.aptitudeAvg ?? null,
          adjusted: adjustedMetrics?.aptitudeAvg ?? null,
          delta: (adjustedMetrics?.aptitudeAvg ?? 0) - (authoritativeMetrics?.aptitudeAvg ?? 0),
          hasOverride: false,
        },
        verbalCompetency: {
          authoritative: authoritativeMetrics?.verbalAvg ?? null,
          adjusted: adjustedMetrics?.verbalAvg ?? null,
          delta: (adjustedMetrics?.verbalAvg ?? 0) - (authoritativeMetrics?.verbalAvg ?? 0),
          hasOverride: false,
        },
        softSkillsCompetency: {
          authoritative: authoritativeMetrics?.softSkillsAvg ?? null,
          adjusted: adjustedMetrics?.softSkillsAvg ?? null,
          delta: (adjustedMetrics?.softSkillsAvg ?? 0) - (authoritativeMetrics?.softSkillsAvg ?? 0),
          hasOverride: false,
        },
        codingScore: {
          authoritative: authoritativeMetrics?.codingAvg ?? null,
          adjusted: adjustedMetrics?.codingAvg ?? null,
          delta: (adjustedMetrics?.codingAvg ?? 0) - (authoritativeMetrics?.codingAvg ?? 0),
          hasOverride: false,
        },
      },
      activeOverrides: this.provenanceLedger.filter((p) =>
        p.affectedScopes.some((s) => s.includes(scopeId) || s.includes(scope))
      ),
    };
  }

  /**
   * Role-based sanitation:
   * Strips internal Editor provenance, reason, and actor IDs for non-superadmin roles.
   */
  public sanitizeForRole(data: any, role: string): any {
    if (role === "super_admin") {
      // Super admin sees full provenance and both layers
      return data;
    }

    // Deep clone to prevent accidental mutation of internal state
    const clean = JSON.parse(JSON.stringify(data));

    // Remove internal reconciliation and audit fields
    if (clean.reconciliation) delete clean.reconciliation;
    if (clean.metadata) {
      delete clean.metadata.appliedOverridesCount;
    }

    // Strip internal override tags from records
    const stripInternalTags = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      delete obj.overriddenBy;
      delete obj.mandatoryReason;
      delete obj.isOverridden;
      delete obj.authoritativeValue;
      delete obj.delta;
      delete obj.internalAuditTrail;
      delete obj.auditMetadata;
      delete obj.provenance;
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === "object") stripInternalTags(obj[k]);
      }
    };

    stripInternalTags(clean);
    return clean;
  }
}

export const intelligenceEngine = new IntelligenceEngine();
