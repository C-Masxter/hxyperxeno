import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { Editable } from "@/components/Editable";
import { Reveal } from "@/components/Motion";
import hyperxenoLogo from "@/assets/hyperxeno-logo.png";

export const Route = createFileRoute("/credits")({ component: Page });

const DISCORD = "https://discord.gg/zUUGVkMt4U";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="glass rounded-2xl p-8 mb-6">
        <div className="text-xs tracking-brand text-ice mb-3">{title}</div>
        {children}
      </div>
    </Reveal>
  );
}

function Page() {
  return (
    <>
      <PageHeader page="credits" eyebrow="CREDITS" fallbackTitle="The HYPER XENO Collective" fallbackBody="Built by hackers, designers, and defenders. Special thanks to every contributor and supporter." />
      <PageShell>
        <Reveal>
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-ice/20 rounded-full" />
              <img
                src={hyperxenoLogo}
                alt="HYPER XENO logo"
                width={1024}
                height={1024}
                loading="lazy"
                className="relative w-44 md:w-56 h-auto drop-shadow-[0_0_40px_oklch(0.82_0.13_230_/_0.4)]"
              />
            </div>
            <div className="mt-4 text-xs tracking-brand text-muted-foreground">EST. 2026 · DEFENSE GRID</div>
          </div>
        </Reveal>

        <Section title="JOIN THE COMMUNITY">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-light"><Editable page="credits" section="discord_title" fallback="Discord Server" /></div>
              <p className="text-muted-foreground mt-2 text-sm"><Editable page="credits" section="discord_body" fallback="Hang out, get support, ship faster." multiline /></p>
            </div>
            <a href={DISCORD} target="_blank" rel="noopener" className="btn-ice">Join Discord →</a>
          </div>
          <div className="mt-3 text-xs text-muted-foreground font-mono break-all">{DISCORD}</div>
        </Section>

        <Section title="CORE TEAM">
          <div className="grid md:grid-cols-3 gap-4">
            {["team_1","team_2","team_3"].map((k, i) => (
              <div key={k} className="border border-border rounded-xl p-5">
                <div className="text-ice text-xs tracking-display">MEMBER {i+1}</div>
                <div className="text-lg mt-1"><Editable page="credits" section={`${k}_name`} fallback={`Member ${i+1}`} /></div>
                <div className="text-xs text-muted-foreground mt-1"><Editable page="credits" section={`${k}_role`} fallback="Role / Title" /></div>
                <p className="text-sm text-muted-foreground mt-3"><Editable page="credits" section={`${k}_bio`} fallback="Short bio." multiline /></p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="🏆 TOP SUPPORTERS">
          <div className="space-y-2">
            {[1,2,3,4,5].map((n) => (
              <div key={n} className="flex items-center justify-between border-t border-border py-3 first:border-t-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-chrome font-light w-8">#{n}</span>
                  <div className="text-sm"><Editable page="credits" section={`top_${n}_name`} fallback={`Supporter ${n}`} /></div>
                </div>
                <div className="text-ice text-sm"><Editable page="credits" section={`top_${n}_amount`} fallback={`$${(6-n)*50}`} /></div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="💝 DONATIONS">
          <p className="text-sm text-muted-foreground"><Editable page="credits" section="donate_body" fallback="Support development and keep HyperXeno free for everyone." multiline /></p>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="border border-ice/30 bg-ice/5 rounded-lg p-4">
              <div className="text-xs tracking-display text-ice">CASHAPP</div>
              <div className="text-2xl font-light mt-1"><Editable page="credits" section="donate_cashapp" fallback="$CMasxter" /></div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="text-xs tracking-display text-muted-foreground">CUSTOM LINK</div>
              <div className="text-sm mt-1"><Editable page="credits" section="donate_link" fallback="https://your-donation-link.com" /></div>
            </div>
          </div>
        </Section>

        <Section title="🚀 SHOWCASE — PROJECTS & TOOLS">
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map((n) => (
              <div key={n} className="border border-border rounded-xl p-5">
                <div className="text-ice text-xs tracking-display">PROJECT {n}</div>
                <div className="text-lg mt-1"><Editable page="credits" section={`show_${n}_name`} fallback={`Project ${n}`} /></div>
                <p className="text-sm text-muted-foreground mt-2"><Editable page="credits" section={`show_${n}_desc`} fallback="What it does." multiline /></p>
                <div className="mt-3 text-xs text-ice"><Editable page="credits" section={`show_${n}_link`} fallback="https://example.com" /></div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="🙏 SPECIAL THANKS">
          <p className="text-sm text-muted-foreground leading-relaxed"><Editable page="credits" section="thanks_body" fallback="Thanks to the open security community, every beta tester, every Discord moderator, and everyone who has ever filed a bug report. You make this possible." multiline /></p>
        </Section>

        <Section title="📝 NOTES">
          <div className="text-xs text-muted-foreground space-y-2">
            <div>Every text on this page is editable inline by admins via Edit Mode. Open the admin terminal → Visual Editor → toggle Edit Mode → click anywhere to edit.</div>
            <div>For deeper structural changes (adding new sections, image galleries, drag-and-drop reordering), use the CMS Editor tab in the admin terminal — sections persist by `page_id="credits"`.</div>
          </div>
        </Section>
      </PageShell>
    </>
  );
}
