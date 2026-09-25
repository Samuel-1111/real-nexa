"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LandingGate(){
  const [show,setShow]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(window.location.pathname!=="/") return;
    const seen=localStorage.getItem("nexa_landing_seen")==="1";
    if(seen){
      createClient().auth.getUser().then(({data})=>{
        if(data.user) window.location.replace("/home");
        else setShow(true);
      }).catch(()=>setShow(true));
      return;
    }
    setShow(true);
    const timer=window.setTimeout(()=>setReady(true),1800);
    return()=>window.clearTimeout(timer);
  },[]);
  if(!show)return null;
  return <div className="landingGate" role="dialog" aria-label="Welcome to NEXA">
    <div className="landingGateInner">
      <div className="landingGateOrb">N</div>
      <div className="landingGateKicker">PERSONAL ASSISTANT</div>
      <h1>NEXA</h1>
      <p>Your personal assistant for a smarter, more organized day.</p>
      <div className={ready?"landingGateNext ready":"landingGateNext"}>
        <button disabled={!ready} onClick={()=>{localStorage.setItem("nexa_landing_seen","1");window.location.assign("/auth?mode=signup");}}>{ready?"Next":"Loading NEXA…"}<span>→</span></button>
      </div>
      <small>Built by Olanlokun Samuel · Samzy Technology</small>
    </div>
  </div>;
}
