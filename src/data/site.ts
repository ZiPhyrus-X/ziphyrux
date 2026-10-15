/**
 * Central site configuration. Contact details and social links are intentionally
 * empty until real values are supplied — the UI hides anything left blank.
 */
export const SITE = {
  name: "Ziphyrus X",
  contactEmail: "", // e.g. "hello@ziphyrus.example" — not yet provided
  social: [] as { label: string; href: string }[],
  demoUrl: "", // when empty, "Request a Demo" opens an explanatory dialog
};

export const NAV = [
  { id: "platform", label: "Platform" },
  { id: "intelligence", label: "Intelligence" },
  { id: "institutions", label: "For Colleges" },
  { id: "journey", label: "For Students" },
  { id: "ecosystem", label: "For Employers" },
  { id: "principles", label: "About" },
] as const;

export const SYSTEM = [
  { k: "Learning", d: "Courses, sessions and material engagement." },
  { k: "Coding", d: "Problems attempted, solved and how." },
  { k: "Assessments", d: "Technical, aptitude and verbal evidence." },
  { k: "Performance", d: "Trends across time, not one snapshot." },
  { k: "Skill Gaps", d: "Distance between current and target skills." },
  { k: "Recommendations", d: "Next steps grounded in evidence." },
  { k: "Placement Readiness", d: "A contextual view, never a single score." },
  { k: "Company Matching", d: "Fit against role-specific requirements." },
  { k: "Outcomes", d: "Tracked results that feed the loop again." },
];

export const LOOP = [
  { k: "Data", d: "Evidence arrives from learning, coding and assessments." },
  { k: "Analysis", d: "Evidence is connected and compared over time." },
  { k: "Decision", d: "A skill gap becomes visible with its supporting evidence." },
  { k: "Recommendation", d: "A specific next step is proposed — and explained." },
  { k: "Action", d: "Students practise, trainers intervene, coordinators plan." },
  { k: "New Data", d: "Fresh evidence updates the picture. The loop continues." },
];

export const AUDIENCES = [
  { k: "Students", d: "Understand strengths, identify gaps, receive recommendations, track progress, and prepare for opportunities." },
  { k: "Trainers", d: "Identify students who need attention, inspect evidence, and take targeted action." },
  { k: "Coordinators", d: "Manage college operations, trainers, academic structures, allocations, schedules, and institutional activity." },
  { k: "Placement Teams", d: "Review authorized student information, placement readiness, applications, and hiring progress." },
  { k: "Employers", d: "Discover authorized candidates, evaluate applications, coordinate interviews, and manage hiring workflows." },
  { k: "Platform Operations", d: "Manage platform configuration, content, feature availability, governance, and access." },
];

/** ILLUSTRATIVE sample data — not real student results. */
export const JOURNEY = [
  { k: "Learning", v: "Completes 'Data Structures II' module", m: "6 sessions" },
  { k: "Coding", v: "Attempts 14 graph problems", m: "9 accepted" },
  { k: "Assessment", v: "Technical assessment — trees & graphs", m: "62 / 100" },
  { k: "Performance", v: "Graph traversal accuracy lags peers", m: "trend ↓" },
  { k: "Skill Gap", v: "Shortest-path algorithms", m: "gap: medium" },
  { k: "Recommendation", v: "Targeted Dijkstra / BFS practice set", m: "8 problems" },
  { k: "Improvement", v: "Re-assessment on the same skill", m: "78 / 100" },
  { k: "Final Deployment", v: "Qualified for enterprise campus drives and verified career placement", m: "Offer secured" },
];

/** ILLUSTRATIVE skill model for the visualization. */
export const SKILLS = [
  { k: "Data Structures", cur: 72, tgt: 85 },
  { k: "Algorithms", cur: 58, tgt: 80 },
  { k: "SQL", cur: 81, tgt: 75 },
  { k: "System Design", cur: 34, tgt: 60 },
  { k: "Communication", cur: 66, tgt: 70 },
  { k: "Aptitude", cur: 70, tgt: 72 },
];

export const PLACEMENT = [
  { k: "Eligibility", d: "Does the student meet the opportunity's configured criteria? A rule check — not a judgement." },
  { k: "Placement Readiness", d: "How prepared is the student, based on available evidence across skills and practice?" },
  { k: "Company Match", d: "How well does the evidence align with this specific role's requirements?" },
  { k: "Application", d: "The student registers or applies — possible even when not eligible, if the workflow allows." },
  { k: "Interview", d: "Employer-led evaluation, coordinated through the platform." },
  { k: "Selection", d: "The employer's decision. Ziphyrus X records it; it does not make it." },
  { k: "Placement Outcome", d: "The final, tracked result — which becomes new evidence for the loop." },
  { k: "Career Onboarding", d: "Verified offer acceptance, compliance documentation, and corporate transition." },
];

export const PRINCIPLES = [
  "Evidence before assumptions",
  "One connected source of truth",
  "Explainable recommendations",
  "Action-oriented intelligence",
  "College-level data boundaries",
  "Measurable progress over time",
];
