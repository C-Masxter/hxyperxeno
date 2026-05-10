import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
export const Route = createFileRoute("/terms")({ component: () => (<><PageHeader page="terms" eyebrow="LEGAL" fallbackTitle="Terms of Service" fallbackBody="By using HYPER XENO you agree to fair use, no reverse engineering, and the appeals process for disputes." /><PageShell><div className="glass rounded-2xl p-10 text-muted-foreground text-sm leading-relaxed">Full terms apply. Contact ops for the complete legal document.</div></PageShell></>) });
