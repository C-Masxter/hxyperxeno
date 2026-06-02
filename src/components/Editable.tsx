import { useEffect, useRef, useState, type ElementType } from "react";
import { useEditMode, saveSection, usePageContent } from "@/lib/cms";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  page: string;
  section: string;
  fallback?: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
};

export function Editable({ page, section, fallback = "", as: Tag = "span", className, multiline }: Props) {
  const content = usePageContent(page, { [section]: fallback });
  const text = content[section] ?? fallback;
  const { enabled } = useEditMode();
  const { isAdmin } = useSession();
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);

  const canEdit = enabled && isAdmin;

  useEffect(() => {
    if (ref.current && !editing) ref.current.textContent = text;
  }, [text, editing]);

  const handleSave = async () => {
    if (!ref.current) return;
    const next = ref.current.textContent ?? "";
    setEditing(false);
    if (next === text) return;
    // Update DOM immediately so it never flashes back to the old value.
    if (ref.current) ref.current.textContent = next;
    try {
      await saveSection(page, section, next);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  return (
    <Tag
      ref={ref as any}
      data-edit-key={`${page}:${section}`}
      className={`${className ?? ""} ${canEdit ? "editable-outline" : ""}`}
      contentEditable={canEdit}
      suppressContentEditableWarning
      onFocus={() => canEdit && setEditing(true)}
      onBlur={canEdit ? handleSave : undefined}
      onKeyDown={(e: any) => { if (!multiline && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
    >{text}</Tag>
  );
}
