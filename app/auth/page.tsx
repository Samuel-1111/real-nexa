"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">((params.get("mode") as "login" | "signup" | "forgot") || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/auth/reset` });
      if (error) setError(error.message); else setNotice("Check your email for the secure password reset link.");
      setBusy(false);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) { setError(error.message); setBusy(false); return; }
      window.location.assign("/home");
      return;
    }

    // Do not call auth.signUp here because the project may have email confirmations enabled.
    // The registration Edge Function creates the account as already email-confirmed.
    const { data, error } = await supabase.functions.invoke("register-user", {
      body: { email: cleanEmail, password, name: name.trim() },
    });

    if (error) { setError(error.message || "Unable to create your account."); setBusy(false); return; }
    if (!data?.success) { setError(data?.error || "Unable to create your account."); setBusy(false); return; }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (loginError) { setError(loginError.message); setBusy(false); return; }
    window.location.assign("/home");
  }

  return <main className="authShell">
    <div className="authCard">
      <button className="authBack" onClick={() => window.location.assign("/")}>‹</button>
      <div className="authBrand">N E X A</div>
      <span className="authKicker">{mode === "signup" ? "CREATE ACCOUNT" : mode === "forgot" ? "PASSWORD RESET" : "WELCOME BACK"}</span>
      <h1>{mode === "signup" ? "Create your NEXA account." : mode === "forgot" ? "Reset your password." : "Log in to NEXA."}</h1>
      <p className="authLead">Your personal assistant for a smarter life.</p>
      <form onSubmit={submit}>
        {mode === "signup" && <label>Full name<input required autoComplete="name" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} /></label>}
        <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {mode !== "forgot" && <label>Password<input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} /></label>}
        {error && <div className="formError">{error}</div>}
        {notice && <div className="authNotice">{notice}</div>}
        <button className="primaryWide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}<span>→</span></button>
      </form>
      <div className="authLinks">
        {mode === "login" && <button onClick={() => setMode("forgot")}>Forgot password?</button>}
        <button onClick={() => { setError(""); setNotice(""); setMode(mode === "login" ? "signup" : "login"); }}>{mode === "login" ? "Create an account" : mode === "signup" ? "Already have an account? Log in" : "Back to log in"}</button>
      </div>
      <div className="authFooter"><span>Private by design</span><button onClick={() => window.open("https://wa.me/2349042987385", "_blank", "noopener,noreferrer")}>NEXA Support</button></div>
    </div>
  </main>;
}

export default function AuthPage() {
  return <Suspense fallback={<main className="authShell"><div className="authCard"><div className="authBrand">N E X A</div><p className="authLead">Loading…</p></div></main>}><AuthForm /></Suspense>;
}
