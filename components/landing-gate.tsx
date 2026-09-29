"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LandingGate(){
  const [visible,setVisible]=useState(false);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    if(window.location.pathname!=="/") return;
    let cancelled=false;
    createClient().auth.getUser().then(({data})=>{
      if(cancelled) return;
      if(data.user){ window.location.replace("/home"); return; }
      const timer=window.setTimeout(()=>{ if(!cancelled){ setVisible(true); window.setTimeout(()=>setReady(true),900); } },900);
      return ()=>window.clearTimeout(timer);
    }).catch(()=>{
      if(cancelled) return;
      const timer=window.setTimeout(()=>{ if(!cancelled){ setVisible(true); window.setTimeout(()=>setReady(true),900); } },900);
      return ()=>window.clearTimeout(timer);
    });
    return ()=>{cancelled=true;};
  },[]);

  if(!visible) return null;

  return <div role="dialog" aria-label="Welcome to NEXA" style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#020817",color:"white",textAlign:"center",fontFamily:"inherit",overflowY:"auto"}}>
    <div style={{width:"min(460px,100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"30px 0"}}>
      <div style={{width:92,height:92,borderRadius:30,display:"grid",placeItems:"center",fontSize:40,fontWeight:900,background:"radial-gradient(circle at 30% 20%,#7c4dff,#1736a8 58%,#020817)",border:"1px solid rgba(255,255,255,.2)",boxShadow:"0 18px 60px rgba(37,99,235,.35)"}}>N</div>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:3,opacity:.58,marginTop:22}}>PERSONAL ASSISTANT</div>
      <h1 style={{fontSize:"clamp(54px,15vw,82px)",lineHeight:.9,margin:"8px 0 12px",letterSpacing:-5}}>NEXA</h1>
      <p style={{maxWidth:350,fontSize:17,lineHeight:1.65,opacity:.72,margin:"0 0 30px"}}>Your personal assistant for a smarter, more organized day.</p>
      <button disabled={!ready} onClick={()=>window.location.assign("/auth?mode=signup")} style={{width:"min(380px,100%)",height:64,border:0,borderRadius:20,fontSize:19,fontWeight:850,cursor:ready?"pointer":"default",background:ready?"linear-gradient(135deg,#2563eb,#7c3aed)":"rgba(255,255,255,.10)",color:"white",boxShadow:ready?"0 18px 50px rgba(37,99,235,.30)":"none",opacity:ready?1:.55,transition:"all .25s ease"}}>{ready?"Next":"Preparing NEXA…"}</button>
      <p style={{marginTop:20,fontSize:12,opacity:.45}}>Create your NEXA account or log in on the next screen.</p>
      <small style={{marginTop:30,opacity:.42,fontSize:11}}>Built by Olanlokun Samuel · Samzy Technology</small>
    </div>
  </div>;
}
