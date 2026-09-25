"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function ToolsLauncher(){
 const [show,setShow]=useState(false);
 useEffect(()=>{const path=window.location.pathname;if(path.startsWith("/auth")||path==="/tools")return;createClient().auth.getUser().then(({data})=>setShow(!!data.user));},[]);
 if(!show)return null;
 return <button aria-label="Open NEXA tools" onClick={()=>window.location.href="/tools"} style={{position:"fixed",right:16,bottom:"calc(env(safe-area-inset-bottom) + 92px)",zIndex:80,border:"1px solid rgba(255,255,255,.16)",background:"rgba(7,18,43,.94)",color:"white",borderRadius:999,padding:"10px 14px",boxShadow:"0 10px 30px rgba(0,0,0,.3)",fontWeight:700}}>NEXA Tools</button>;
}
