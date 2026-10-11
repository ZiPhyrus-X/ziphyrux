import { createFileRoute } from "@tanstack/react-router";
import { EditorOverview } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/")({ component: EditorOverview });
