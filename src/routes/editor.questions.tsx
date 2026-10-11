import { createFileRoute } from "@tanstack/react-router";
import { QuestionsPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/questions")({ component: QuestionsPage });
