"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome:"accepted"|"dismissed"; platform:string }>;
};

export default function InstallPrompt(){
  const [installEvent,setInstallEvent]=useState<BeforeInstallPromptEvent|null>(null);
  const [visible,setVisible]=useState(false);
  const [ios,setIos]=useState(false);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    const standalone=window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
    if(standalone){setInstalled(true);return;}
    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIOS);
    const timer=window.setTimeout(()=>setVisible(true),1100);
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>undefined);

    const capture=(event:Event)=>{event.preventDefault();setInstallEvent(event as BeforeInstallPromptEvent);setVisible(true);};
    const done=()=>{setInstalled(true);setVisible(false);setInstallEvent(null);};
    window.addEventListener("beforeinstallprompt",capture);
    window.addEventListener("appinstalled",done);
    return()=>{clearTimeout(timer);window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",done);};
  },[]);

  async function install(){
    if(installEvent){
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);setVisible(false);
      return;
    }
    if(ios){
      window.alert("To install NEXA on iPhone: tap Share in Safari, then choose “Add to Home Screen”.");
    }else{
      window.alert("Open your browser menu and choose “Install NEXA” or “Add to Home screen”.");
    }
  }

  if(installed||!visible)return null;
  return <aside className="installBanner" role="dialog" aria-label="Install NEXA">
    <div className="installIcon">N</div>
    <div className="installCopy"><strong>Install NEXA</strong><span>Add NEXA to your Home Screen for a real app-like experience.</span></div>
    <button className="installButton" onClick={install}>Install</button>
    <button className="installClose" onClick={()=>setVisible(false)} aria-label="Close">×</button>
  </aside>;
}
