"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:"accepted"|"dismissed"}>;
};

declare global {
  interface Window {
    __nexaInstallPrompt?: BeforeInstallPromptEvent;
    __nexaPromptInstall?: ()=>Promise<"accepted"|"dismissed"|"unavailable">;
    Capacitor?: {isNativePlatform?:()=>boolean};
  }
}

export default function InstallPrompt(){
  const [deferred,setDeferred]=useState<BeforeInstallPromptEvent|null>(null);
  const [show,setShow]=useState(false);
  const [ios,setIos]=useState(false);
  const [android,setAndroid]=useState(false);
  const [installed,setInstalled]=useState(false);
  const [guide,setGuide]=useState(false);

  useEffect(()=>{
    if(window.Capacitor?.isNativePlatform?.()) return;

    const standalone=window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & {standalone?:boolean}).standalone===true;

    if(standalone){ setInstalled(true); return; }

    const ua=navigator.userAgent.toLowerCase();
    const isIOS=/iphone|ipad|ipod/.test(ua) && !("MSStream" in window);
    const isAndroid=/android/.test(ua);
    setIos(isIOS);
    setAndroid(isAndroid);

    // Register the service worker immediately, including on the first landing visit.
    // This is required for the browser to recognize NEXA as an installable PWA.
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>undefined);
    }

    const onBefore=(event:Event)=>{
      event.preventDefault();
      const installEvent=event as BeforeInstallPromptEvent;
      window.__nexaInstallPrompt=installEvent;
      setDeferred(installEvent);
      setGuide(false);

      // Tell the landing/auth UI that the browser has an install prompt ready.
      window.dispatchEvent(new Event("nexa-install-ready"));

      // Don't cover the first landing screen; the landing "Next" button
      // can invoke this native browser prompt directly.
      if(window.location.pathname!=="/" || localStorage.getItem("nexa_landing_seen")==="1"){
        setShow(true);
      }
    };

    const onInstalled=()=>{
      setInstalled(true);
      setShow(false);
      setDeferred(null);
      window.__nexaInstallPrompt=undefined;
      window.dispatchEvent(new Event("nexa-install-complete"));
    };

    const promptInstall=async()=>{
      const event=window.__nexaInstallPrompt || deferred;
      if(!event) return "unavailable" as const;
      await event.prompt();
      const result=await event.userChoice;
      window.__nexaInstallPrompt=undefined;
      setDeferred(null);
      if(result.outcome==="accepted") setShow(false);
      return result.outcome;
    };

    window.__nexaPromptInstall=promptInstall;

    window.addEventListener("beforeinstallprompt",onBefore);
    window.addEventListener("appinstalled",onInstalled);

    // If this browser doesn't support the Chromium prompt, the in-app
    // installation guide remains available after the user reaches auth.
    const timer=window.setTimeout(()=>{
      if(window.location.pathname!=="/" && !standalone) setShow(true);
    },1200);

    return()=>{
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt",onBefore);
      window.removeEventListener("appinstalled",onInstalled);
      if(window.__nexaPromptInstall===promptInstall) window.__nexaPromptInstall=undefined;
    };
  },[]);

  if(installed||!show)return null;

  async function install(){
    const result=await window.__nexaPromptInstall?.() || "unavailable";
    if(result==="unavailable") setGuide(true);
  }

  return <div style={{position:"fixed",left:12,right:12,bottom:"calc(12px + env(safe-area-inset-bottom))",zIndex:100000,maxWidth:560,margin:"0 auto",padding:16,borderRadius:24,background:"rgba(7,12,27,.98)",border:"1px solid rgba(255,255,255,.15)",boxShadow:"0 24px 80px rgba(0,0,0,.58)",color:"white",backdropFilter:"blur(18px)"}}>
    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <img src="/icon-192.svg" alt="NEXA" width="54" height="54" style={{borderRadius:16,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <strong style={{display:"block",fontSize:16}}>Install NEXA</strong>
        <span style={{display:"block",marginTop:4,fontSize:12,lineHeight:1.45,opacity:.72}}>Install NEXA on your phone and use it like a real app with its own icon and app window.</span>
      </div>
    </div>
    <button onClick={()=>void install()} style={{marginTop:13,width:"100%",border:0,borderRadius:14,padding:"13px 12px",fontWeight:850,background:"white",color:"#10131d"}}>Install NEXA</button>
    {guide&&<div style={{marginTop:13,padding:13,borderRadius:16,background:"rgba(255,255,255,.06)",fontSize:12,lineHeight:1.55,opacity:.9}}>
      {ios
        ? <>On iPhone, open NEXA in <b>Safari</b> → <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.</>
        : android
          ? <>This browser did not provide an automatic install prompt. Open the browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.</>
          : <>This browser does not provide an automatic install prompt. Use its menu and choose <b>Install</b> or <b>Add to Home screen</b>.</>}
    </div>}
    <button onClick={()=>setShow(false)} style={{marginTop:10,width:"100%",border:0,background:"transparent",color:"rgba(255,255,255,.48)",fontSize:12}}>Not now</button>
  </div>;
}
