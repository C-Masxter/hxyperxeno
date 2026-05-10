import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { registerWithUsername } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: Page });

function Page() {
  const nav = useNavigate();
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-z0-9_]{3,24}$/i.test(u)) return toast.error("Username: 3–24 chars, letters/numbers/underscore");
    if (p.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    const { error } = await registerWithUsername(u, p);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    nav({ to: "/dashboard" });
  };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <form onSubmit={submit} className="glass-strong rounded-2xl w-full max-w-md p-10">
        <div className="text-xs tracking-brand text-ice mb-2">CREATE ACCESS</div>
        <h1 className="text-3xl font-light">Register</h1>
        <p className="text-sm text-muted-foreground mt-2">Pick a username. No email needed.</p>
        <div className="mt-8 space-y-3">
          <input required placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-ice" />
          <input required type="password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-ice" />
        </div>
        <button disabled={busy} className="btn-ice mt-6 w-full">{busy ? "Creating…" : "Create account"}</button>
        <div className="text-sm text-center mt-6 text-muted-foreground">Already have one? <Link to="/login" className="text-ice">Sign in</Link></div>
      </form>
    </div>
  );
}
