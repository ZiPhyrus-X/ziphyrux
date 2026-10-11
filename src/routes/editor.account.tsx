import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/features/editor/pages";

export const Route = createFileRoute("/editor/account")({ component: AccountPage });
