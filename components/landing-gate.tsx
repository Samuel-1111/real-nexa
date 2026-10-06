"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LandingGate(){
  const [show,setShow]=useState(false);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    let timer:number|undefined;
    let readyTimer:number|undefined;

    async function start(){
      if(window.location.pathname!=="/") return;
      try{
        const {data}=await createClient().auth.getUser();
        if(cancelled)return;
        if(data.user){window.location.replace("/home");return;}

        const seen=localStorage.getItem("nexa_landing_seen")==="1";
        if(seen){
          window.location.replace("/auth?mode=login");
          return;
        }
      }catch{}

      timer=window.setTimeout(()=>{
        if(cancelled)return;
        setShow(true);
        readyTimer=window.setTimeout(()=>{
          if(!cancelled)setReady(true);
        },700);
      },850);
    }

    void start();
    return()=>{
      cancelled=true;
      if(timer)window.clearTimeout(timer);
      if(readyTimer)window.clearTimeout(readyTimer);
    };
  },[]);

  if(!show)return null;

  return <main role="dialog" aria-label="Welcome to NEXA" style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:"24px",background:"#020817",color:"white",textAlign:"center",fontFamily:"inherit",overflowY:"auto",overscrollBehavior:"none"}}>
    <section style={{width:"min(460px,100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 0 max(32px,env(safe-area-inset-bottom))"}}>
      <div style={{width:92,height:92,borderRadius:28,display:"grid",placeItems:"center",fontSize:40,fontWeight:900,background:"radial-gradient(circle at 30% 20%,#7c4dff,#1736a8 58%,#020817)",border:"1px solid rgba(255,255,255,.2)",boxShadow:"0 18px 60px rgba(37,99,235,.35)"}}>N</div>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:3,opacity:.58,marginTop:22}}>PERSONAL ASSISTANT</div>
      <h1 style={{fontSize:"clamp(54px,15vw,82px)",lineHeight:.9,margin:"8px 0 12px",letterSpacing:-5}}>NEXA</h1>
      <p style={{maxWidth:350,fontSize:17,lineHeight:1.65,opacity:.72,margin:"0 0 30px"}}>Your personal assistant for a smarter, more organized day.</p>
      <button disabled={!ready} onClick={()=>{
        if(!ready)return;
        localStorage.setItem("nexa_landing_seen","1");
        window.location.assign("/auth?mode=signup");
      }} style={{width:"min(380px,100%)",height:64,border:0,borderRadius:20,fontSize:19,fontWeight:850,cursor:ready?"pointer":"default",background:ready?"linear-gradient(135deg,#2563eb,#7c3aed)":"rgba(255,255,255,.10)",color:"white",boxShadow:ready?"0 18px 50px rgba(37,99,235,.30)":"none",opacity:ready?1:.55,transition:"all .25s ease"}}>{ready?"Next":"Preparing NEXA…"}</button>
      <p style={{marginTop:20,fontSize:12,opacity:.45}}>Create your NEXA account or log in on the next screen.</p>
      <small style={{marginTop:30,opacity:.42,fontSize:11}}>Built by Olanlokun Samuel · Samzy Technology</small>
    </section>
  </main>;
}
