import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/community")({ component: Page });
function Page() {
  const { userId } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "" });
  const load = () => supabase.from("community_posts").select("*").eq("hidden", false).order("created_at", { ascending: false }).then(({ data }) => setPosts(data ?? []));
  useEffect(() => { load(); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error("Login first");
    const { error } = await supabase.from("community_posts").insert({ ...form, user_id: userId });
    if (error) return toast.error(error.message);
    setForm({ title: "", body: "" }); load();
  };
  return (<>
    <PageHeader page="community" eyebrow="COMMUNITY" fallbackTitle="Community" fallbackBody="Join the HYPER XENO collective." />
    <PageShell>
      {userId && (
        <form onSubmit={submit} className="glass rounded-xl p-6 mb-8 space-y-3">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <textarea required placeholder="Share intel…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice min-h-24" />
          <button className="btn-ice">Post</button>
        </form>
      )}
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="glass rounded-xl p-5">
            <div className="text-lg">{p.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{p.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  </>);
}
