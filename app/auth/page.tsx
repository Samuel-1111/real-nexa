"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">((params.get("mode") as "login" | "signup") || "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) window.location.replace("/home");
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !password || (mode === "signup" && !cleanName)) {
      setError(mode === "signup" ? "Enter your name, Gmail/email and password." : "Enter your Gmail/email and password.");
      setBusy(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setBusy(false);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) { setError(error.message); setBusy(false); return; }
      localStorage.setItem("nexa_has_account", "1");
      localStorage.setItem("nexa_landing_seen", "1");
      window.location.replace("/home");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { display_name: cleanName, full_name: cleanName } },
    });
    if (error) { setError(error.message); setBusy(false); return; }

    localStorage.setItem("nexa_has_account", "1");
    localStorage.setItem("nexa_landing_seen", "1");

    // Password-only NEXA onboarding: no Google, OTP, magic-link or extra authentication step.
    if (!data.session) {
      setError("Account created. Please log in with your Gmail/email and password.");
      setMode("login");
      setBusy(false);
      return;
    }
    window.location.replace("/home");
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
        <label>Gmail / Email address<input required type="email" autoComplete="email" placeholder="you@gmail.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
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
