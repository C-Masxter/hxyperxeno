import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";

export const Route = createFileRoute("/demo")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader page="demo" eyebrow="LIVE" fallbackTitle="Live Protection Demo" fallbackBody="Watch HYPER XENO intercept simulated threats in real time." />
      <PageShell>
        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
          <div className="scan-line" />
          <div className="text-xs tracking-display text-ice mb-3">DEFENSE STREAM — LIVE CAPTURE</div>
          <div className="rounded-xl overflow-hidden border border-border bg-black">
            <img
              src="https://xenobypass.vercel.app/C_x_J_Project/Screenshot.png"
              alt="HYPER XENO live protection screenshot"
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        </div>
      </PageShell>
    </>
  );
}
