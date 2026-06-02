import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CmsMap = Record<string, string>;

const cache = new Map<string, CmsMap>();
const listeners = new Map<string, Set<(m: CmsMap) => void>>();

const LS_PREFIX = "hx-cms-v1::";
function readLS(pageId: string): CmsMap | null {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem(LS_PREFIX + pageId); return s ? JSON.parse(s) : null; } catch { return null; }
}
function writeLS(pageId: string, m: CmsMap) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_PREFIX + pageId, JSON.stringify(m)); } catch {}
}

export async function loadPageContent(pageId: string): Promise<CmsMap> {
  const { data } = await supabase
    .from("page_content")
    .select("section_id, content_text")
    .eq("page_id", pageId);
  const map: CmsMap = {};
  (data ?? []).forEach((r: any) => (map[r.section_id] = r.content_text));
  cache.set(pageId, map);
  writeLS(pageId, map);
  listeners.get(pageId)?.forEach((fn) => fn(map));
  return map;
}

export function usePageContent(pageId: string, fallback: CmsMap = {}) {
  // Keep the first client render identical to SSR, then hydrate cached edits.
  const [content, setContent] = useState<CmsMap>(() => {
    if (cache.has(pageId)) return cache.get(pageId)!;
    return fallback;
  });
  useEffect(() => {
    const ls = readLS(pageId);
    if (ls) {
      cache.set(pageId, ls);
      setContent(ls);
    }
    // Always refetch in background to stay fresh.
    loadPageContent(pageId).then(setContent);
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
