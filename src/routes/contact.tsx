import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { Editable } from "@/components/Editable";
export const Route = createFileRoute("/contact")({ component: () => (
  <>
    <PageHeader page="contact" eyebrow="CONTACT" fallbackTitle="Contact" fallbackBody="Reach our security operations center anytime." />
    <PageShell><div className="glass rounded-2xl p-10 text-center">
      <div className="text-xs tracking-display text-muted-foreground">EMAIL</div>
      <div className="text-2xl text-ice mt-2"><Editable page="contact" section="email" fallback="ops@hyperxeno.io" /></div>
    </div></PageShell>
  </>
)});
