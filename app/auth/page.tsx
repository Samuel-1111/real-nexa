"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage(){
  const [name,setName]=useState("");
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

  async function createAccount(e:React.FormEvent){
    e.preventDefault();
    if(busy)return;
    const cleanName=name.trim();
    if(!cleanName){setError("Enter your name to continue.");return;}
    setBusy(true);setError("");

    // NEXA APK onboarding uses Supabase anonymous authentication internally.
    // No Gmail, password, OTP or Google login is shown to the user.
    const {data,error}=await supabase.auth.signInAnonymously({options:{data:{display_name:cleanName,full_name:cleanName}}});
    if(error || !data.user){
      setError(error?.message || "NEXA could not create your account right now.");
      setBusy(false);
      return;
    }

    localStorage.setItem("nexa_has_account","1");
    localStorage.setItem("nexa_landing_seen","1");
    window.location.replace("/");
  }

  return <main className="authShell">
    <div className="authCard">
      <button className="authBack" onClick={()=>window.location.assign("/")}>‹</button>
      <div className="authBrand">N E X A</div>
      <span className="authKicker">CREATE YOUR ACCOUNT</span>
      <h1>Welcome to NEXA.</h1>
      <p className="authLead">Tell NEXA what to call you. No email, password or OTP required.</p>
      <form onSubmit={createAccount}>
        <label>Full name<input required autoComplete="name" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/></label>
        {error&&<div className="formError">{error}</div>}
        <button className="primaryWide" disabled={busy}>{busy?"Creating your NEXA…":"Create my NEXA account"}<span>→</span></button>
      </form>
      <div className="authFooter"><span>Private by design</span><button onClick={()=>window.open("https://wa.me/2349042987385","_blank","noopener,noreferrer")}>NEXA Support</button></div>
    </div>
  </main>;
}
