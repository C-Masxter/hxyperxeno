import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
export const Route = createFileRoute("/privacy")({ component: () => (<><PageHeader page="privacy" eyebrow="LEGAL" fallbackTitle="Privacy Policy" fallbackBody="We collect only what is required to operate the service. Telemetry is opt-in. We never sell data." /><PageShell><div className="glass rounded-2xl p-10 text-muted-foreground text-sm leading-relaxed">Privacy is core to HYPER XENO's design.</div></PageShell></>) });
