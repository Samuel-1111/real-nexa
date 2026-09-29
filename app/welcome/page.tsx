"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WelcomePage(){
  const [ready,setReady]=useState(false);
  const supabase=createClient();

  useEffect(()=>{
    const timer=window.setTimeout(()=>setReady(true),1200);
    supabase.auth.getUser().then(({data})=>{
      if(data.user){
        localStorage.setItem("nexa_has_account","1");
        localStorage.setItem("nexa_landing_seen","1");
        window.location.replace("/");
      }
    }).catch(()=>undefined);
    return()=>window.clearTimeout(timer);
  },[supabase]);

  return <main className="stage">
    <div className="phone onboarding">
      <span className="brand">NEXA</span>
      <div className="onboardingCopy">
        <span className="eyebrow">YOUR PERSONAL ASSISTANT</span>
        <h1>More than<br/>just an <b>assistant.</b></h1>
        <p>Stay organized, boost your productivity and handle everyday tasks in one beautiful place.</p>
      </div>
      <div className="deviceArt"><div className="orb orbSmall"><span>N</span></div><span>✓</span><span>◷</span><span>✎</span></div>
      <button className="primaryWide" disabled={!ready} onClick={()=>{localStorage.setItem("nexa_landing_seen","1");location.assign("/auth")}}>
        {ready?<>Next <span>→</span></>:"Welcome to NEXA…"}
      </button>
      <div className="builtBy">Built by Olanlokun Samuel<span>Samzy Technology</span></div>
    </div>
  </main>;
}
