import { Editable } from "@/components/Editable";
import { Reveal } from "@/components/Motion";

export function PageHeader({ page, eyebrow, fallbackTitle, fallbackBody }: { page: string; eyebrow?: string; fallbackTitle: string; fallbackBody?: string }) {
  return (
    <div className="px-6 pt-24 pb-12">
      <div className="mx-auto max-w-5xl text-center">
        {eyebrow && <Reveal><div className="text-xs tracking-brand text-ice mb-4">{eyebrow}</div></Reveal>}
        <Reveal delay={100}><h1 className="text-4xl md:text-6xl font-light"><Editable page={page} section="title" fallback={fallbackTitle} /></h1></Reveal>
        {fallbackBody !== undefined && <Reveal delay={200}><p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"><Editable page={page} section="body" fallback={fallbackBody} multiline /></p></Reveal>}
      </div>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 pb-24">{children}</div>;
}
