import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/content")({ component: ContentPage });
