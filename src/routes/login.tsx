import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginWithUsername } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Page });

function Page() {
  const nav = useNavigate();
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await loginWithUsername(u, p);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/dashboard" });
  };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <form onSubmit={submit} className="glass-strong rounded-2xl w-full max-w-md p-10">
        <div className="text-xs tracking-brand text-ice mb-2">SECURE ACCESS</div>
        <h1 className="text-3xl font-light">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-2">Username only — no email required.</p>
        <div className="mt-8 space-y-3">
          <input required placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-ice" />
          <input required type="password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-ice" />
        </div>
        <button disabled={busy} className="btn-ice mt-6 w-full">{busy ? "Authenticating…" : "Sign in"}</button>
        <div className="text-sm text-center mt-6 text-muted-foreground">No account? <Link to="/register" className="text-ice">Register</Link></div>
      </form>
    </div>
  );
}
