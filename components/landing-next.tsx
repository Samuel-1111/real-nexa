"use client";

import { useEffect, useState } from "react";

export default function LandingNext(){
  const [show,setShow]=useState(false);
  useEffect(()=>{
    if(window.location.pathname!=="/") return;
    if(localStorage.getItem("nexa_landing_seen")==="1") return;
    const t=window.setTimeout(()=>setShow(true),900);
    return()=>window.clearTimeout(t);
  },[]);
  if(!show)return null;
  return <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16,pointerEvents:"none"}}>
    <div style={{width:"min(100%,520px)",padding:18,borderRadius:28,background:"rgba(10,13,25,.96)",border:"1px solid rgba(255,255,255,.12)",boxShadow:"0 24px 80px rgba(0,0,0,.45)",color:"white",pointerEvents:"auto",backdropFilter:"blur(18px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:52,height:52,borderRadius:16,display:"grid",placeItems:"center",background:"linear-gradient(135deg,#fff,#9ba7ff)",color:"#111",fontWeight:900,fontSize:22}}>N</div>
        <div style={{flex:1}}><strong style={{display:"block",fontSize:18}}>Welcome to NEXA</strong><span style={{display:"block",marginTop:4,opacity:.72,fontSize:13}}>Your personal assistant. Continue to create your account or log in.</span></div>
      </div>
      <button onClick={()=>{localStorage.setItem("nexa_landing_seen","1");window.location.assign("/auth?mode=signup")}} style={{width:"100%",marginTop:16,border:0,borderRadius:16,padding:"15px 18px",fontSize:16,fontWeight:800,cursor:"pointer",background:"white",color:"#10131d"}}>Next →</button>
    </div>
  </div>;
}
