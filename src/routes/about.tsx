import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
export const Route = createFileRoute("/about")({ component: () => (<><PageHeader page="about" eyebrow="ABOUT" fallbackTitle="About HYPER XENO" fallbackBody="Founded by a coalition of ex-defense engineers, HYPER XENO redefines endpoint protection from first principles." /><PageShell><div className="glass rounded-2xl p-10 text-muted-foreground">A premium, principled approach to defense — quiet, calm, relentless.</div></PageShell></>) });
