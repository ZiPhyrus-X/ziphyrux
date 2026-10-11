import { createFileRoute } from "@tanstack/react-router";
import { AssessmentsPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/assessments")({ component: AssessmentsPage });
