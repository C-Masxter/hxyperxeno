import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";

export const Route = createFileRoute("/downloads")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader page="downloads" eyebrow="DOWNLOADS" fallbackTitle="Choose your tier to unlock" fallbackBody="Builds are gated behind purchase. Pricing below — no public installers." />
      <PageShell>
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-lg text-muted-foreground">Public download links are not provided. Each tier unlocks installers after purchase verification.</p>
          <Link to="/pricing" className="btn-ice mt-8 inline-flex">View Pricing</Link>
        </div>
      </PageShell>
    </>
  );
}
