import { createFileRoute } from "@tanstack/react-router";
import { FeaturesPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/features")({ component: FeaturesPage });
