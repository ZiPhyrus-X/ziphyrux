import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/history")({ component: HistoryPage });
