"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">((params.get("mode") as "login" | "signup") || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) { setError(error.message); setBusy(false); return; }
      window.location.assign("/home");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { display_name: name.trim() } },
    });

    if (error) { setError(error.message); setBusy(false); return; }

    // Production NEXA auth is configured with email confirmations disabled.
    // A successful signup therefore returns a live session immediately.
    if (!data.session) {
      setError("Account creation did not start a session. Please try again.");
      setBusy(false);
      return;
    }

    window.location.assign("/home");
  }

  return <main className="authShell">
    <div className="authCard">
      <button className="authBack" onClick={() => window.location.assign("/")}>‹</button>
      <div className="authBrand">N E X A</div>
      <span className="authKicker">{mode === "signup" ? "CREATE ACCOUNT" : "WELCOME BACK"}</span>
      <h1>{mode === "signup" ? "Create your NEXA account." : "Log in to NEXA."}</h1>
      <p className="authLead">Your personal assistant for a smarter life.</p>
      <form onSubmit={submit}>
        {mode === "signup" && <label>Full name<input required autoComplete="name" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} /></label>}
        <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <div className="formError">{error}</div>}
        <button className="primaryWide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}<span>→</span></button>
      </form>
      <div className="authLinks">
        <button onClick={() => { setError(""); setMode(mode === "login" ? "signup" : "login"); }}>
          {mode === "login" ? "Create an account" : "Already have an account? Log in"}
        </button>
      </div>
      <div className="authFooter"><span>Private by design</span><button onClick={() => window.open("https://wa.me/2349042987385", "_blank", "noopener,noreferrer")}>NEXA Support</button></div>
    </div>
  </main>;
}

export default function AuthPage() {
  return <Suspense fallback={<main className="authShell"><div className="authCard"><div className="authBrand">N E X A</div><p className="authLead">Loading…</p></div></main>}><AuthForm /></Suspense>;
}
