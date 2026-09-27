"use client";

import { useEffect, useState } from "react";
import InstallPrompt from "@/components/install-prompt";

export default function WelcomePage(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setReady(true),1200);return()=>window.clearTimeout(timer)},[]);
  return <>
    <InstallPrompt/>
    <main className="stage">
      <div className="phone onboarding">
        <span className="brand">NEXA</span>
        <div className="onboardingCopy">
          <span className="eyebrow">YOUR PERSONAL ASSISTANT</span>
          <h1>More than<br/>just an <b>assistant.</b></h1>
          <p>Stay organized, boost your productivity and handle everyday tasks in one beautiful place.</p>
        </div>
        <div className="deviceArt"><div className="orb orbSmall"><span>N</span></div><span>✓</span><span>◷</span><span>✎</span></div>
        <button className="primaryWide" disabled={!ready} onClick={()=>{localStorage.setItem("nexa_landing_seen","1");location.assign("/auth?mode=signup")}}>
          {ready?<>Next <span>→</span></>:"Welcome to NEXA…"}
        </button>
        <button className="secondaryLink" disabled={!ready} onClick={()=>{localStorage.setItem("nexa_landing_seen","1");location.assign("/auth?mode=login")}}>
          Already have an account? <b>Log in</b>
        </button>
        <div className="builtBy">Built by Olanlokun Samuel<span>Samzy Technology</span></div>
      </div>
    </main>
  </>;
}
