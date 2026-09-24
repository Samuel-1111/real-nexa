"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthForm(){
  const params=useSearchParams();
  const [mode,setMode]=useState<"login"|"signup"|"forgot">((params.get("mode") as "login"|"signup"|"forgot")||"login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
  const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(false);
  const supabase=createClient();

  async function submit(e:React.FormEvent){
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    if(mode==="forgot"){
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/reset`});
      if(error)setError(error.message); else setNotice("Check your email for the secure password reset link.");
      setBusy(false); return;
    }
    const result=mode==="login"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
    if(result.error){setError(result.error.message);setBusy(false);return;}
    if(mode==="signup" && !result.data.session){setNotice("Account created. Check your email to verify your address.");setBusy(false);return;}
    window.location.assign("/");
  }
  async function google(){
    setError("");
    const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/auth/callback`}});
    if(error)setError(error.message);
  }
  return <main className="authShell"><div className="authCard">
    <button className="backBrand" onClick={()=>window.location.assign("/")}>‹</button>
    <div className="brand">NEXA</div>
    <h1>{mode==="login"?"Welcome back.":mode==="signup"?"Create your NEXA account.":"Reset your password."}</h1>
    <p className="muted">Your personal assistant for a smarter life.</p>
    {mode!=="forgot" && <button className="oauth" onClick={google}>Continue with Google</button>}
    {mode!=="forgot" && <div className="divider"><span>or</span></div>}
    <form onSubmit={submit}>
      {mode==="signup"&&<input required placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}
      <input required type="email" autoComplete="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
      {mode!=="forgot"&&<input required type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={8} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>}
      {error&&<div className="authError">{error}</div>}
      {notice&&<div className="authNotice">{notice}</div>}
      <button className="cta" disabled={busy}>{busy?"Please wait…":mode==="login"?"Log In":mode==="signup"?"Create Account":"Send Reset Link"}</button>
    </form>
    <div className="authLinks">
      {mode==="login"&&<button onClick={()=>setMode("forgot")}>Forgot password?</button>}
      <button onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create an account":"Already have an account? Log in"}</button>
    </div>
  </div></main>
}

export default function AuthPage(){ return <Suspense fallback={<main className="authShell"><div className="authCard"><div className="brand">NEXA</div><p className="muted">Loading…</p></div></main>}><AuthForm/></Suspense> }
