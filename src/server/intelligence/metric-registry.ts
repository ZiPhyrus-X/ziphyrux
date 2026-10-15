/**
 * Ziphyrus X — Authoritative Metric Registry & Calculation Contracts
 * Defines the immutable contracts for metrics across all academic intelligence scopes.
 *
 * Scopes: Platform → College → Year → Branch → Semester → Section → Student
 */

export type MetricScope =
  | "platform"
  | "college"
  | "year"
  | "branch"
  | "semester"
  | "section"
  | "student";

export type MetricUnit = "%" | "score" | "count" | "ratio" | "distribution";
export type AggregationRule = "population_avg" | "weighted_avg" | "sum" | "distribution_count";
export type MissingDataBehavior = "exclude_from_denominator" | "preserve_null";

export interface MetricDefinition {
  id: string;
  name: string;
  unit: MetricUnit;
  dataType: "number" | "distribution" | "record";
  authoritativeSource: string;
  calculationFormula: string;
  aggregationRule: AggregationRule;
  applicableScopes: MetricScope[];
  allowedFilters: string[];
  reportingPeriod: "current_academic_cycle" | "historical";
  missingDataBehavior: MissingDataBehavior;
  presentationOverridePermitted: boolean;
  adjustedAggregationSupported: boolean;
  isVerifiedOutcome: boolean;
  displayPolicy: "standard" | "verified_only" | "internal_audit";
  description: string;
}

export const METRIC_REGISTRY: Record<string, MetricDefinition> = {
  met_readiness_score: {
    id: "met_readiness_score",
    name: "Employability Readiness Score",
    unit: "%",
    dataType: "number",
    authoritativeSource: "student.intelligence_profile",
    calculationFormula: "Weighted Composite: Technical(35%) + Aptitude(25%) + Verbal(15%) + SoftSkills(10%) + Coding(15%)",
    aggregationRule: "population_avg",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "semester", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "exclude_from_denominator",
    presentationOverridePermitted: true,
    adjustedAggregationSupported: true,
    isVerifiedOutcome: false,
    displayPolicy: "standard",
    description: "Official composite employability index calculated by the Intelligence Engine.",
  },

  met_technical_competency: {
    id: "met_technical_competency",
    name: "Technical Domain Competency",
    unit: "%",
    dataType: "number",
    authoritativeSource: "assessment.attempts (Domain: Technical)",
    calculationFormula: "Average score on verified Technical diagnostic assessments",
    aggregationRule: "population_avg",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "preserve_null",
    presentationOverridePermitted: true,
    adjustedAggregationSupported: true,
    isVerifiedOutcome: true,
    displayPolicy: "standard",
    description: "Mastery benchmark in core Computer Science & discipline engineering subjects.",
  },

  met_aptitude_competency: {
    id: "met_aptitude_competency",
    name: "Quantitative & Logical Aptitude",
    unit: "%",
    dataType: "number",
    authoritativeSource: "assessment.attempts (Domain: Aptitude)",
    calculationFormula: "Average score on verified Aptitude diagnostic assessments",
    aggregationRule: "population_avg",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "preserve_null",
    presentationOverridePermitted: true,
    adjustedAggregationSupported: true,
    isVerifiedOutcome: true,
    displayPolicy: "standard",
    description: "Problem solving, quantitative logic, and analytical reasoning benchmark.",
  },

  met_verbal_competency: {
    id: "met_verbal_competency",
    name: "Verbal & Communication Competency",
    unit: "%",
    dataType: "number",
    authoritativeSource: "assessment.attempts (Domain: Verbal)",
    calculationFormula: "Average score on verified Verbal diagnostic assessments",
    aggregationRule: "population_avg",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "preserve_null",
    presentationOverridePermitted: true,
    adjustedAggregationSupported: true,
    isVerifiedOutcome: true,
    displayPolicy: "standard",
    description: "English comprehension, grammar, and workplace communication benchmark.",
  },

  met_soft_skills_competency: {
    id: "met_soft_skills_competency",
    name: "Soft Skills & Professional Readiness",
    unit: "%",
    dataType: "number",
    authoritativeSource: "assessment.attempts (Domain: Soft Skills)",
    calculationFormula: "Average score on verified Soft Skills diagnostic assessments",
    aggregationRule: "population_avg",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "preserve_null",
    presentationOverridePermitted: true,
    adjustedAggregationSupported: true,
    isVerifiedOutcome: true,
    displayPolicy: "standard",
    description: "Behavioral, teamwork, and professional interview readiness benchmark.",
  },

  met_coding_judge_score: {
    id: "met_coding_judge_score",
    name: "Automated Coding Judge Score",
    unit: "score",
    dataType: "number",
    authoritativeSource: "coding.submissions (Automated Judge verdicts)",
    calculationFormula: "Weighted test-case passing rate on algorithmic problems",
    aggregationRule: "population_avg",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "exclude_from_denominator",
    presentationOverridePermitted: false, // Coding Judge verdicts are immutable verified evidence!
    adjustedAggregationSupported: false,
    isVerifiedOutcome: true,
    displayPolicy: "verified_only",
    description: "Raw sandbox execution verdicts from the automated coding evaluation engine.",
  },

  met_coding_problems_solved: {
    id: "met_coding_problems_solved",
    name: "Coding Problems Solved",
    unit: "count",
    dataType: "number",
    authoritativeSource: "coding.submissions (Accepted verdicts)",
    calculationFormula: "Count of unique problems with Accepted verdict",
    aggregationRule: "sum",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section", "student"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "exclude_from_denominator",
    presentationOverridePermitted: false,
    adjustedAggregationSupported: false,
    isVerifiedOutcome: true,
    displayPolicy: "standard",
    description: "Unique problem count accepted by the automated test suite.",
  },

  met_readiness_bands_distribution: {
    id: "met_readiness_bands_distribution",
    name: "Employability Readiness Band Distribution",
    unit: "distribution",
    dataType: "distribution",
    authoritativeSource: "student.intelligence_profile (readinessScore)",
    calculationFormula: "High (>=75%), Medium (60-74%), Needs Attention (<60%)",
    aggregationRule: "distribution_count",
    applicableScopes: ["platform", "college", "year", "branch", "semester", "section"],
    allowedFilters: ["collegeCode", "department", "year", "section"],
    reportingPeriod: "current_academic_cycle",
    missingDataBehavior: "exclude_from_denominator",
    presentationOverridePermitted: false,
    adjustedAggregationSupported: true, // Recalculates dynamically based on adjusted readiness
    isVerifiedOutcome: false,
    displayPolicy: "standard",
    description: "Mutually exclusive distribution of students across employability readiness tiers.",
  },
};
