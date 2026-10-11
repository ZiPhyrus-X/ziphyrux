import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/notifications")({ component: NotificationsPage });
