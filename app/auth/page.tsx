"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage(){
  const [mode,setMode]=useState<"signup"|"login">("signup");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const supabase=createClient();

  useEffect(()=>{
    let cancelled=false;
    supabase.auth.getUser().then(({data})=>{
      if(!cancelled && data.user) window.location.replace("/");
    }).catch(()=>undefined);
    return()=>{cancelled=true;};
  },[supabase]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(busy)return;
    const cleanName=name.trim();
    const cleanEmail=email.trim().toLowerCase();
    if(mode==="signup"&&!cleanName){setError("Enter your full name to continue.");return;}
    if(!cleanEmail||!password){setError("Enter your email and password.");return;}
    if(password.length<6){setError("Your password must be at least 6 characters.");return;}
    setBusy(true);setError("");

    if(mode==="signup"){
      const {data,error}=await supabase.auth.signUp({email:cleanEmail,password,options:{data:{display_name:cleanName,full_name:cleanName}}});
      if(error||!data.user){
        setError(error?.message||"NEXA could not create your account right now.");
        setBusy(false);return;
      }
      // NEXA intentionally does not use an email-verification screen.
      // When Supabase email confirmation is disabled, signUp returns an active session immediately.
      if(!data.session){
        setError("Account created, but email confirmation is still enabled in the NEXA authentication settings. Disable email confirmation to keep NEXA on straight login.");
        setBusy(false);return;
      }
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
      if(error||!data.user){setError(error?.message||"Incorrect email or password.");setBusy(false);return;}
    }

    localStorage.setItem("nexa_has_account","1");
    localStorage.setItem("nexa_landing_seen","1");
    window.location.replace("/");
  }

  return <main className="authShell">
    <div className="authCard">
      <button className="authBack" onClick={()=>window.location.assign("/")}>‹</button>
      <div className="authBrand">N E X A</div>
      <span className="authKicker">{mode==="signup"?"CREATE YOUR NEXA ACCOUNT":"WELCOME BACK"}</span>
      <h1>{mode==="signup"?"Welcome to NEXA.":"Welcome back."}</h1>
      <p className="authLead">{mode==="signup"?"Create your account and go straight into NEXA. No Google, OTP or verification screen.":"Log in and go straight to your NEXA home."}</p>
      <form onSubmit={submit}>
        {mode==="signup"&&<label>Full name<input required autoComplete="name" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/></label>}
        <label>Email<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Password<input required type="password" autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="At least 6 characters" value={password} onChange={e=>setPassword(e.target.value)}/></label>
        {error&&<div className="formError">{error}</div>}
        <button className="primaryWide" disabled={busy}>{busy?(mode==="signup"?"Creating your NEXA…":"Signing you in…"):(mode==="signup"?"Create my NEXA account":"Log in to NEXA")}<span>→</span></button>
      </form>
      <button className="secondaryLink" type="button" onClick={()=>{setMode(mode==="signup"?"login":"signup");setError("")}}>{mode==="signup"?"Already have an account?":"New to NEXA?"} <b>{mode==="signup"?"Log in":"Create an account"}</b></button>
      <div className="authFooter"><span>Private by design</span><button onClick={()=>window.open("https://wa.me/2349042987385","_blank","noopener,noreferrer")}>NEXA Support</button></div>
    </div>
  </main>;
}
