import { useEffect } from "react";
import { useEditMode } from "@/lib/cms";
import { useSession } from "@/lib/auth";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function cssPath(el: Element, root: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root && cur.parentElement) {
    const parent: Element = cur.parentElement;
    const sib: Element[] = Array.from(parent.children);
    const idx = sib.indexOf(cur) + 1;
    parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${idx})`);
    cur = parent;
  }
  return parts.join(">");
}

function isEditableLeaf(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (["script", "style", "svg", "path", "input", "textarea", "button"].includes(tag)) {
    // allow buttons/inputs? skip — too risky
    if (tag !== "button") return false;
  }
  if (el.closest("[data-no-edit]")) return false;
  if (el.hasAttribute("contenteditable")) return false;
  // only leaves (no element children)
  if (el.children.length > 0) return false;
  const text = (el.textContent ?? "").trim();
  if (!text) return false;
  if (text.length > 800) return false;
  return true;
}

export function GlobalEditor() {
  const { enabled } = useEditMode();
  const { isAdmin } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = enabled && isAdmin;

  // Apply persisted overrides (for everyone) — keep re-applying as the DOM mutates,
  // so React re-renders from async data don't wipe out saved edits for anon visitors.
  useEffect(() => {
    let cancelled = false;
    let rows: Array<{ section_id: string; content_text: string }> = [];
    let obs: MutationObserver | null = null;
    let applying = false;

    const applyAll = () => {
      const main = document.querySelector("main");
      if (!main || rows.length === 0 || applying) return;
      applying = true;
      try {
        rows.forEach((row) => {
          try {
            const el = main.querySelector(row.section_id);
            if (el && el.textContent !== row.content_text) {
              el.textContent = row.content_text;
            }
          } catch {}
        });
      } finally {
        applying = false;
      }
    };

    (async () => {
      const { data } = await supabase
        .from("page_content")
        .select("section_id, content_text")
        .eq("page_id", `auto:${path}`);
      if (cancelled || !data) return;
      rows = data as any;
      applyAll();
      [100, 400, 1000, 2500].forEach((ms) =>
        setTimeout(() => { if (!cancelled) applyAll(); }, ms)
      );
      const main = document.querySelector("main");
      if (!main) return;
      obs = new MutationObserver(() => applyAll());
      obs.observe(main, { childList: true, subtree: true, characterData: true });
    })();

    return () => {
      cancelled = true;
      if (obs) obs.disconnect();
    };
  }, [path]);

  // Edit-mode wiring
  useEffect(() => {
    if (!active) return;
    const main = document.querySelector("main");
    if (!main) return;
    const wired = new WeakSet<Element>();
    const handlers = new Map<Element, () => void>();

    const wire = (el: Element) => {
      if (wired.has(el)) return;
      if (!isEditableLeaf(el)) return;
      wired.add(el);
      el.classList.add("editable-outline");
      (el as HTMLElement).contentEditable = "true";
      const onBlur = async () => {
        const sel = cssPath(el, main);
        const text = el.textContent ?? "";
        const { error } = await supabase.from("page_content").upsert({
          page_id: `auto:${path}`,
          section_id: sel,
          content_text: text,
          updated_at: new Date().toISOString(),
        }, { onConflict: "page_id,section_id" });
        if (error) toast.error(error.message); else toast.success("Saved");
      };
      el.addEventListener("blur", onBlur);
      handlers.set(el, onBlur);
    };

    const scan = () => main.querySelectorAll("*").forEach(wire);
    scan();
    const obs = new MutationObserver(() => scan());
    obs.observe(main, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      handlers.forEach((fn, el) => {
        el.removeEventListener("blur", fn);
        (el as HTMLElement).contentEditable = "false";
        el.classList.remove("editable-outline");
      });
    };
  }, [active, path]);

  return null;
}
