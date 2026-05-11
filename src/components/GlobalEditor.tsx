import { useEffect, useRef, useState } from "react";
import { useEditMode } from "@/lib/cms";
import { useSession } from "@/lib/auth";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Universal visual editor.
// - When admin toggles Edit Mode, EVERY visible text node inside <main> is
//   wrapped in a <span data-hxedit> made contentEditable.
// - A floating toolbar (text color picker) appears next to the focused span.
// - Saves persist to page_content keyed by `auto:<pathname>` + a stable
//   selector "<parentCssPath>|t<index>" (or "...#color" for color overrides).
// - Saved overrides are applied for everyone on page load.
// ---------------------------------------------------------------------------

const PAGE_PREFIX = "auto:";
const COLOR_SUFFIX = "#color";

function cssPath(el: Element, root: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root && cur.parentElement) {
    const parent: Element = cur.parentElement;
    const idx = Array.from(parent.children).indexOf(cur) + 1;
    parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${idx})`);
    cur = parent;
  }
  return parts.join(">");
}

function isSkippableAncestor(node: Node | null): boolean {
  let cur: Node | null = node;
  while (cur) {
    if (cur.nodeType === 1) {
      const el = cur as Element;
      const tag = el.tagName.toLowerCase();
      if (["script", "style", "svg", "noscript", "input", "textarea", "select", "code", "pre"].includes(tag)) return true;
      if (el.hasAttribute("data-no-edit")) return true;
      if (el.hasAttribute("data-hxedit")) return true;
    }
    cur = cur.parentNode;
  }
  return false;
}

function wrapTextNodes(root: HTMLElement): HTMLSpanElement[] {
  const wrappers: HTMLSpanElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isSkippableAncestor(node.parentNode)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) targets.push(n as Text);
  for (const t of targets) {
    const parent = t.parentElement;
    if (!parent) continue;
    // index of THIS text node among parent's child nodes that are also text-bearing
    const idx = Array.from(parent.childNodes).indexOf(t);
    const span = document.createElement("span");
    span.setAttribute("data-hxedit", "1");
    span.setAttribute("data-hxidx", String(idx));
    // store a path on the parent so we can recompute later
    const path = cssPath(parent, root);
    span.setAttribute("data-hxparent", path);
    span.textContent = t.nodeValue;
    parent.replaceChild(span, t);
    wrappers.push(span);
  }
  return wrappers;
}

function unwrapAll(root: HTMLElement) {
  const spans = root.querySelectorAll("span[data-hxedit]");
  spans.forEach((s) => {
    const parent = s.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(s.textContent ?? ""), s);
    parent.normalize();
  });
}

export function GlobalEditor() {
  const { enabled } = useEditMode();
  const { isAdmin } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = enabled && isAdmin;
  const [focused, setFocused] = useState<HTMLElement | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const overridesRef = useRef<{ section: string; text: string }[]>([]);

  // Apply overrides for every visitor (admin or not).
  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      const pageId = `${PAGE_PREFIX}${path}`;
      const { data } = await supabase
        .from("page_content")
        .select("section_id, content_text")
        .eq("page_id", pageId);
      if (cancelled || !data) return;
      overridesRef.current = data.map((r: any) => ({ section: r.section_id, text: r.content_text }));
      const main = document.querySelector("main");
      if (!main) return;

      let tries = 0;
      const run = () => {
        data.forEach((row: any) => {
          const sec = row.section_id as string;
          const isColor = sec.endsWith(COLOR_SUFFIX);
          const base = isColor ? sec.slice(0, -COLOR_SUFFIX.length) : sec;
          const [parentSel, marker] = base.split("|");
          const idxMatch = marker?.match(/^t(\d+)$/);
          if (!parentSel || !idxMatch) return;
          let parent: Element | null = null;
          try { parent = main.querySelector(parentSel); } catch { return; }
          if (!parent) return;
          const idx = Number(idxMatch[1]);
          const child = parent.childNodes[idx];
          if (!child) return;
          if (isColor) {
            const wrapper = child.nodeType === 1 && (child as Element).hasAttribute?.("data-hxedit")
              ? (child as HTMLElement)
              : null;
            if (wrapper) wrapper.style.color = row.content_text;
            else if (child.nodeType === 3) {
              // wrap the text node so we can color it
              const span = document.createElement("span");
              span.style.color = row.content_text;
              span.textContent = (child as Text).nodeValue;
              parent!.replaceChild(span, child);
            }
          } else {
            if (child.nodeType === 3) (child as Text).nodeValue = row.content_text;
            else if (child.nodeType === 1) (child as HTMLElement).textContent = row.content_text;
          }
        });
        if (tries++ < 6) setTimeout(run, 250);
      };
      run();
    };
    apply();
    return () => { cancelled = true; };
  }, [path]);

  // Edit mode wiring
  useEffect(() => {
    if (!active) return;
    const main = document.querySelector("main");
    if (!main) return;

    let wrappers: HTMLSpanElement[] = wrapTextNodes(main as HTMLElement);
    const obs = new MutationObserver(() => {
      // wrap any newly inserted text
      const fresh = wrapTextNodes(main as HTMLElement);
      wrappers = wrappers.concat(fresh);
    });
    obs.observe(main, { childList: true, subtree: true, characterData: false });

    const wireSpan = (span: HTMLElement) => {
      span.classList.add("editable-outline");
      span.setAttribute("contenteditable", "true");
      span.spellcheck = false;
    };
    wrappers.forEach(wireSpan);
    // also re-wire on each fresh batch
    const wireObs = new MutationObserver(() => {
      main.querySelectorAll("span[data-hxedit]:not([contenteditable])").forEach((s) => wireSpan(s as HTMLElement));
    });
    wireObs.observe(main, { childList: true, subtree: true });

    const onFocusIn = (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t?.hasAttribute?.("data-hxedit")) return;
      setFocused(t);
      const r = t.getBoundingClientRect();
      setToolbarPos({ top: window.scrollY + r.top - 44, left: window.scrollX + r.left });
    };
    const onBlurOut = async (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t?.hasAttribute?.("data-hxedit")) return;
      const parentSel = t.getAttribute("data-hxparent")!;
      const idx = t.getAttribute("data-hxidx")!;
      const section = `${parentSel}|t${idx}`;
      const text = t.textContent ?? "";
      const { error } = await supabase.from("page_content").upsert({
        page_id: `${PAGE_PREFIX}${path}`,
        section_id: section,
        content_text: text,
        updated_at: new Date().toISOString(),
      }, { onConflict: "page_id,section_id" });
      if (error) toast.error(error.message); else toast.success("Saved");
      setTimeout(() => setFocused((cur) => (cur === t ? null : cur)), 200);
    };
    main.addEventListener("focusin", onFocusIn);
    main.addEventListener("focusout", onBlurOut);

    return () => {
      obs.disconnect();
      wireObs.disconnect();
      main.removeEventListener("focusin", onFocusIn);
      main.removeEventListener("focusout", onBlurOut);
      unwrapAll(main as HTMLElement);
      setFocused(null);
      setToolbarPos(null);
    };
  }, [active, path]);

  if (!active || !focused || !toolbarPos) return null;

  return (
    <div
      data-no-edit
      className="fixed z-[200] flex items-center gap-2 rounded-md border border-border bg-background/95 backdrop-blur px-2 py-1 shadow-lg"
      style={{ top: toolbarPos.top, left: toolbarPos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span className="text-[10px] tracking-display text-muted-foreground">EDIT</span>
      <input
        type="color"
        className="h-6 w-8 cursor-pointer bg-transparent"
        defaultValue="#7dd3fc"
        onChange={async (e) => {
          if (!focused) return;
          focused.style.color = e.target.value;
          const parentSel = focused.getAttribute("data-hxparent")!;
          const idx = focused.getAttribute("data-hxidx")!;
          await supabase.from("page_content").upsert({
            page_id: `${PAGE_PREFIX}${path}`,
            section_id: `${parentSel}|t${idx}${COLOR_SUFFIX}`,
            content_text: e.target.value,
            updated_at: new Date().toISOString(),
          }, { onConflict: "page_id,section_id" });
          toast.success("Color saved");
        }}
        title="Text color"
      />
      <button
        className="text-[10px] text-muted-foreground hover:text-ice px-1"
        onClick={async () => {
          if (!focused) return;
          focused.style.color = "";
          const parentSel = focused.getAttribute("data-hxparent")!;
          const idx = focused.getAttribute("data-hxidx")!;
          await supabase.from("page_content").delete()
            .eq("page_id", `${PAGE_PREFIX}${path}`)
            .eq("section_id", `${parentSel}|t${idx}${COLOR_SUFFIX}`);
          toast.success("Color reset");
        }}
      >reset color</button>
    </div>
  );
}
