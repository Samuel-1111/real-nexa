"use client";

import { useEffect, useState } from "react";

declare global { interface Window { __nexaInstallPrompt?: Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:string}> }; Capacitor?: { isNativePlatform?:()=>boolean }; } }

export default function InstallPrompt(){
  const [deferred,setDeferred]=useState<Window["__nexaInstallPrompt"]>(undefined); const [show,setShow]=useState(false); const [ios,setIos]=useState(false); const [installed,setInstalled]=useState(false);
  useEffect(()=>{
    if(window.Capacitor?.isNativePlatform?.()) return;
    const standalone=window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & {standalone?:boolean}).standalone===true; setInstalled(standalone); if(standalone)return;
    const onBefore=(event:Event)=>{event.preventDefault();const promptEvent=event as Window["__nexaInstallPrompt"];window.__nexaInstallPrompt=promptEvent;setDeferred(promptEvent);setShow(true);}; const onInstalled=()=>{setInstalled(true);setShow(false);setDeferred(undefined);};
    window.addEventListener("beforeinstallprompt",onBefore); window.addEventListener("appinstalled",onInstalled); const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!("MSStream" in window); if(isIOS){setIos(true);setShow(true);} if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
    return()=>{window.removeEventListener("beforeinstallprompt",onBefore);window.removeEventListener("appinstalled",onInstalled);};
  },[]);
  if(installed||!show)return null;
  async function install(){if(deferred){await deferred.prompt();const result=await deferred.userChoice;if(result.outcome==="accepted")setShow(false);return;}if(ios){setShow(true);return;}setShow(false);}
  return <div style={{position:"fixed",left:16,right:16,bottom:"calc(16px + env(safe-area-inset-bottom))",zIndex:100000,maxWidth:520,margin:"0 auto",padding:16,borderRadius:22,background:"rgba(10,13,25,.97)",border:"1px solid rgba(255,255,255,.14)",boxShadow:"0 20px 70px rgba(0,0,0,.5)",color:"white"}}><div style={{display:"flex",gap:12,alignItems:"center"}}><img src="/icon-192.svg" alt="NEXA" width="52" height="52" style={{borderRadius:15}}/><div style={{flex:1}}><strong style={{display:"block",fontSize:16}}>Install NEXA</strong><span style={{display:"block",marginTop:4,fontSize:12,opacity:.68}}>{ios?"Use Share → Add to Home Screen to install NEXA.":"Install NEXA on your phone for a full-screen app experience."}</span></div>{!ios&&<button onClick={()=>void install()} style={{border:0,borderRadius:13,padding:"11px 15px",fontWeight:800,background:"white",color:"#10131d"}}>Install</button>}</div>{ios&&<div style={{marginTop:12,fontSize:12,lineHeight:1.55,opacity:.7}}>Safari: tap Share, choose <b>Add to Home Screen</b>, then tap Add.</div>}<button onClick={()=>setShow(false)} style={{marginTop:10,width:"100%",border:0,background:"transparent",color:"rgba(255,255,255,.48)",fontSize:12}}>Not now</button></div>;
}
