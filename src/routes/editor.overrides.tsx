import { createFileRoute } from "@tanstack/react-router";
import { OverridesPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/overrides")({ component: OverridesPage });
