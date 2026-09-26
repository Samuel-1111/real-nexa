"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LandingGate(){
 const [show,setShow]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  if(window.location.pathname!=="/")return;
  const seen=localStorage.getItem("nexa_landing_seen")==="1";
  if(seen){
   createClient().auth.getUser().then(({data})=>{if(data.user)window.location.replace("/home");else setShow(true)}).catch(()=>setShow(true));
   return;
  }
  setShow(true);
  const t=window.setTimeout(()=>setReady(true),3500);
  return()=>window.clearTimeout(t);
 },[]);
 if(!show)return null;
 return <div role="dialog" aria-label="Welcome to NEXA" style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#020817",color:"white",textAlign:"center",fontFamily:"inherit"}}>
  <div style={{width:"min(430px,100%)",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
   <div style={{width:88,height:88,borderRadius:28,display:"grid",placeItems:"center",fontSize:40,fontWeight:900,background:"linear-gradient(145deg,#172554,#0f172a)",border:"1px solid rgba(255,255,255,.18)",boxShadow:"0 18px 60px rgba(0,0,0,.45)"}}>N</div>
   <div style={{fontSize:11,fontWeight:800,letterSpacing:3,opacity:.6,marginTop:12}}>PERSONAL ASSISTANT</div>
   <h1 style={{fontSize:"clamp(48px,14vw,76px)",lineHeight:.9,margin:"4px 0",letterSpacing:-4}}>NEXA</h1>
   <p style={{maxWidth:330,fontSize:16,lineHeight:1.6,opacity:.72,margin:"4px 0 20px"}}>Your personal assistant for a smarter, more organized day.</p>
   <button disabled={!ready} onClick={()=>{localStorage.setItem("nexa_landing_seen","1");window.location.assign("/auth?mode=login")}} style={{width:"100%",maxWidth:340,height:62,border:0,borderRadius:20,cursor:ready?"pointer":"wait",fontSize:18,fontWeight:800,color:"white",background:ready?"linear-gradient(135deg,#2563eb,#7c3aed)":"rgba(255,255,255,.1)",boxShadow:ready?"0 16px 45px rgba(37,99,235,.3)":"none",opacity:ready?1:.65,transition:"all .25s"}}>{ready?<>Next <span style={{marginLeft:12}}>→</span></>:"Welcome to NEXA…"}</button>
   <small style={{marginTop:26,opacity:.42,fontSize:11}}>Built by Olanlokun Samuel · Samzy Technology</small>
  </div>
 </div>
}
