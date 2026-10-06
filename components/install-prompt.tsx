"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:"accepted"|"dismissed"}> };
declare global { interface Window { __nexaInstallPrompt?: BeforeInstallPromptEvent; Capacitor?: {isNativePlatform?:()=>boolean}; } }


export default function InstallPrompt(){
  const [deferred,setDeferred]=useState<BeforeInstallPromptEvent|null>(null);
  const [show,setShow]=useState(false);
  const [ios,setIos]=useState(false);
  const [android,setAndroid]=useState(false);
  const [installed,setInstalled]=useState(false);
  const [guide,setGuide]=useState(false);

  useEffect(()=>{
    if(window.Capacitor?.isNativePlatform?.()) return;
    const standalone=window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & {standalone?:boolean}).standalone===true;
    if(standalone){setInstalled(true);return;}
    // Keep the first-time landing page clean. The install offer appears after
    // the user advances to account/authentication or returns to the app.
    const landingFirstVisit=window.location.pathname==="/" && localStorage.getItem("nexa_landing_seen")!=="1";
    if(landingFirstVisit)return;
    const ua=navigator.userAgent.toLowerCase();
    const isIOS=/iphone|ipad|ipod/.test(ua) && !("MSStream" in window);
    setIos(isIOS); setAndroid(/android/.test(ua));
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>undefined);
    const onBefore=(event:Event)=>{
      event.preventDefault();
      const installEvent=event as BeforeInstallPromptEvent;
      window.__nexaInstallPrompt=installEvent;
      setDeferred(installEvent);
      setShow(true);
      setGuide(false);
    };
    const onInstalled=()=>{setInstalled(true);setShow(false);setDeferred(null);window.__nexaInstallPrompt=undefined;};
    window.addEventListener("beforeinstallprompt",onBefore);
    window.addEventListener("appinstalled",onInstalled);
    const timer=window.setTimeout(()=>setShow(true),900);
    return()=>{window.clearTimeout(timer);window.removeEventListener("beforeinstallprompt",onBefore);window.removeEventListener("appinstalled",onInstalled);};
  },[]);

  if(installed||!show)return null;

  async function install(){
    if(deferred){
      await deferred.prompt();
      const result=await deferred.userChoice;
      setDeferred(null);
      if(result.outcome==="accepted")setShow(false);
      return;
    }
    setGuide(true);
  }

  return <div style={{position:"fixed",left:12,right:12,bottom:"calc(12px + env(safe-area-inset-bottom))",zIndex:100000,maxWidth:560,margin:"0 auto",padding:16,borderRadius:24,background:"rgba(7,12,27,.98)",border:"1px solid rgba(255,255,255,.15)",boxShadow:"0 24px 80px rgba(0,0,0,.58)",color:"white",backdropFilter:"blur(18px)"}}>
    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <img src="/icon-192.svg" alt="NEXA" width="54" height="54" style={{borderRadius:16,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}><strong style={{display:"block",fontSize:16}}>Get NEXA on your phone</strong><span style={{display:"block",marginTop:4,fontSize:12,lineHeight:1.45,opacity:.72}}>Use NEXA like a real mobile app with its own icon and full-screen experience.</span></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:android?"1fr 1fr":"1fr",gap:8,marginTop:13}}>
      <button onClick={()=>void install()} style={{border:0,borderRadius:14,padding:"13px 12px",fontWeight:850,background:"white",color:"#10131d"}}>Install NEXA</button>
      
    </div>
    {guide&&<div style={{marginTop:13,padding:13,borderRadius:16,background:"rgba(255,255,255,.06)",fontSize:12,lineHeight:1.55,opacity:.9}}>{ios?<>On iPhone, Apple does not allow a website to force-install itself. Open this page in <b>Safari</b> → <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.</>:android?<>Your browser does not expose the automatic install prompt. Open the browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>. If this browser supports PWA installation, NEXA will be added as an app with its own icon and full-screen window.</>:<>This browser does not expose a native install prompt. Use its browser menu and choose <b>Install</b> or <b>Add to Home screen</b> when available.</>}</div>}
    <button onClick={()=>setShow(false)} style={{marginTop:10,width:"100%",border:0,background:"transparent",color:"rgba(255,255,255,.48)",fontSize:12}}>Not now</button>
  </div>;
}
