"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase";

export default function AuthPage(){
 const [mode,setMode]=useState<"login"|"signup">("login");
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
 const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const supabase=createSupabaseBrowserClient();
  const r=mode==="login"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
  if(r.error)setError(r.error.message); else window.location.href="/"; setBusy(false);
 }
 return <main className="authShell"><div className="authCard"><div className="brand">NEXA</div><h1>{mode==="login"?"Welcome back.":"Create your NEXA account."}</h1><p className="muted">Your personal assistant for a smarter life.</p><form onSubmit={submit}>{mode==="signup"&&<input required placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}<input required type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><input required type="password" minLength={8} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<div className="authError">{error}</div>}<button className="cta" disabled={busy}>{busy?"Please wait…":mode==="login"?"Log In":"Create Account"}</button></form><button className="switch" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create an account":"Already have an account? Log in"}</button></div></main>
}
