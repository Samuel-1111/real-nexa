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
  const [showInstructions,setShowInstructions]=useState(false);

  useEffect(()=>{
    const standalone=window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
    if(standalone){setInstalled(true);return;}

    // Let the first-time landing experience finish first. After the user taps
    // Next, expose the install experience on the account/home flow.
    const isLanding=window.location.pathname==="/";
    if(isLanding && localStorage.getItem("nexa_landing_seen")!=="1") return;

    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIOS);
    setVisible(true);

    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>undefined);
    }

    const capture=(event:Event)=>{
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const done=()=>{setInstalled(true);setVisible(false);setInstallEvent(null);};
    window.addEventListener("beforeinstallprompt",capture);
    window.addEventListener("appinstalled",done);
    return()=>{window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",done);};
  },[]);

  async function install(){
    if(installEvent){
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      setVisible(false);
      return;
    }
    setShowInstructions(true);
  }

  if(installed||!visible)return null;
  return <>
    <aside className="installBanner" role="dialog" aria-label="Install NEXA">
      <div className="installIcon">N</div>
      <div className="installCopy"><strong>Install NEXA</strong><span>Get NEXA on your home screen like an app.</span></div>
      <button className="installButton" onClick={()=>void install()}>Install</button>
      <button className="installClose" onClick={()=>setVisible(false)} aria-label="Close">×</button>
    </aside>
    {showInstructions&&<div className="sheetBackdrop" role="dialog" aria-modal="true" onMouseDown={()=>setShowInstructions(false)}>
      <aside className="sheet" onMouseDown={e=>e.stopPropagation()} style={{maxWidth:430}}>
        <div className="sheetHead"><h3>Install NEXA</h3><button onClick={()=>setShowInstructions(false)}>×</button></div>
        <div style={{padding:"8px 20px 28px",lineHeight:1.6}}>
          {ios?<>
            <strong>iPhone / iPad</strong>
            <p>Open NEXA in Safari, tap the Share button, then choose <b>Add to Home Screen</b>.</p>
          </>:<>
            <strong>Android / other browser</strong>
            <p>If your browser supports app installation, choose <b>Install app</b> or <b>Add to Home screen</b> from the browser menu.</p>
            <p>If the browser does not support PWA installation, it cannot be forced to install an app from a website. NEXA is already configured as a PWA and supported browsers will provide the native install prompt automatically.</p>
          </>}
        </div>
      </aside>
    </div>}
  </>;
}
