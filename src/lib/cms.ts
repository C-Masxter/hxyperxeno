import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CmsMap = Record<string, string>;

const cache = new Map<string, CmsMap>();
const listeners = new Map<string, Set<(m: CmsMap) => void>>();

export async function loadPageContent(pageId: string): Promise<CmsMap> {
  const { data } = await supabase
    .from("page_content")
    .select("section_id, content_text")
    .eq("page_id", pageId);
  const map: CmsMap = {};
  (data ?? []).forEach((r: any) => (map[r.section_id] = r.content_text));
  cache.set(pageId, map);
  listeners.get(pageId)?.forEach((fn) => fn(map));
  return map;
}

export function usePageContent(pageId: string, fallback: CmsMap = {}) {
  const [content, setContent] = useState<CmsMap>(() => cache.get(pageId) ?? fallback);
  useEffect(() => {
    if (!cache.has(pageId)) loadPageContent(pageId).then(setContent);
    else setContent(cache.get(pageId)!);
    if (!listeners.has(pageId)) listeners.set(pageId, new Set());
    const set = listeners.get(pageId)!;
    set.add(setContent);
    return () => { set.delete(setContent); };
  }, [pageId]);
  return { ...fallback, ...content };
}

export async function saveSection(pageId: string, sectionId: string, text: string) {
  const { data: existing } = await supabase
    .from("page_content").select("id, content_text")
    .eq("page_id", pageId).eq("section_id", sectionId).maybeSingle();
  if (existing) {
    await supabase.from("content_versions").insert({
      page_id: pageId, section_id: sectionId, content_text: existing.content_text,
    });
  }
  const { error } = await supabase.from("page_content").upsert({
    page_id: pageId, section_id: sectionId, content_text: text, updated_at: new Date().toISOString(),
  }, { onConflict: "page_id,section_id" });
  if (error) throw error;
  await loadPageContent(pageId);
}

export function useEditMode() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const f = () => setEnabled(localStorage.getItem("hx-edit-mode") === "1");
    f();
    window.addEventListener("storage", f);
    window.addEventListener("hx-edit-mode-change", f);
    return () => {
      window.removeEventListener("storage", f);
      window.removeEventListener("hx-edit-mode-change", f);
    };
  }, []);
  const toggle = useCallback(() => {
    const next = !enabled;
    localStorage.setItem("hx-edit-mode", next ? "1" : "0");
    window.dispatchEvent(new Event("hx-edit-mode-change"));
  }, [enabled]);
  return { enabled, toggle };
}
