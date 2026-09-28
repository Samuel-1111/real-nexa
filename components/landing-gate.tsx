"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const APK_URL = "https://github.com/Samuel-1111/real-nexa/releases/latest/download/NEXA.apk";

export default function LandingGate(){
 const [show,setShow]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  if(window.location.pathname!=="/")return;
  let cancelled=false;
  createClient().auth.getUser().then(({data})=>{
   if(cancelled)return;
   if(data.user){window.location.replace("/home");return;}
   setShow(true);
   const t=window.setTimeout(()=>setReady(true),3000);
   return()=>window.clearTimeout(t);
  }).catch(()=>{
   if(cancelled)return;
   setShow(true);
   const t=window.setTimeout(()=>setReady(true),3000);
   return()=>window.clearTimeout(t);
  });
  return()=>{cancelled=true;};
 },[]);
 if(!show)return null;
 return <div role="dialog" aria-label="NEXA download" style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#020817",color:"white",textAlign:"center",fontFamily:"inherit",overflowY:"auto"}}>
  <div style={{width:"min(470px,100%)",display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"20px 0"}}>
   <div style={{width:88,height:88,borderRadius:28,display:"grid",placeItems:"center",fontSize:40,fontWeight:900,background:"radial-gradient(circle at 30% 20%,#7c4dff,#1736a8 58%,#020817)",border:"1px solid rgba(255,255,255,.2)",boxShadow:"0 18px 60px rgba(37,99,235,.35)"}}>N</div>
   <div style={{fontSize:11,fontWeight:800,letterSpacing:3,opacity:.6,marginTop:10}}>PERSONAL ASSISTANT</div>
   <h1 style={{fontSize:"clamp(48px,14vw,76px)",lineHeight:.9,margin:"4px 0",letterSpacing:-4}}>NEXA</h1>
   <p style={{maxWidth:360,fontSize:16,lineHeight:1.6,opacity:.72,margin:"4px 0 16px"}}>Your personal assistant for a smarter, more organized day.</p>
   <div style={{width:"100%",maxWidth:380,display:"grid",gap:12}}>
    <a href={ready?APK_URL:"#"} aria-disabled={!ready} onClick={e=>{if(!ready)e.preventDefault()}} style={{height:62,borderRadius:20,display:"grid",placeItems:"center",textDecoration:"none",fontSize:18,fontWeight:800,color:"white",background:ready?"linear-gradient(135deg,#2563eb,#7c3aed)":"rgba(255,255,255,.1)",boxShadow:ready?"0 16px 45px rgba(37,99,235,.3)":"none",opacity:ready?1:.65}}>{ready?"Download Android APK":"Preparing NEXA…"}</a>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <button disabled style={{height:54,borderRadius:17,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.55)",fontWeight:700}}>iOS · Not yet released</button>
      <button disabled style={{height:54,borderRadius:17,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.55)",fontWeight:700}}>Windows · Not yet released</button>
    </div>
   </div>
   <div style={{marginTop:20,maxWidth:370,fontSize:12,lineHeight:1.6,opacity:.48}}>Install the Android APK and use NEXA as a native mobile application. The app uses the same NEXA account, AI assistant and backend.</div>
   <small style={{marginTop:16,opacity:.42,fontSize:11}}>Built by Olanlokun Samuel · Samzy Technology</small>
  </div>
 </div>
}
