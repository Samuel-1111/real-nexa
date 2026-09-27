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

    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIOS);
    // Show the NEXA install control on the first visit too. Supported browsers
    // will expose the native install prompt; unsupported browsers get guidance.
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
      <div className="installCopy"><strong>Install NEXA</strong><span>Install NEXA on your phone like a real app.</span></div>
      <button className="installButton" onClick={()=>void install()}>Install</button>
      <button className="installClose" onClick={()=>setVisible(false)} aria-label="Close">×</button>
    </aside>
    {showInstructions&&<div className="sheetBackdrop" role="dialog" aria-modal="true" onMouseDown={()=>setShowInstructions(false)}>
      <aside className="sheet" onMouseDown={e=>e.stopPropagation()} style={{maxWidth:430}}>
        <div className="sheetHead"><h3>Install NEXA</h3><button onClick={()=>setShowInstructions(false)}>×</button></div>
        <div style={{padding:"8px 20px 28px",lineHeight:1.6}}>
          {ios?<>
            <strong>iPhone / iPad</strong>
            <p>For the full app-style experience, open NEXA in Safari, tap <b>Share</b>, then choose <b>Add to Home Screen</b>.</p>
          </>:<>
            <strong>Android / Chrome</strong>
            <p>If this browser supports PWA installation, tapping <b>Install</b> opens the browser's native install prompt.</p>
            <p>If the browser does not expose a native prompt, open its menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
          </>}
          <p style={{fontSize:12,opacity:.7}}>A website cannot force-install an app on a browser that does not support PWA installation. NEXA is configured to install as a PWA wherever the browser supports it.</p>
        </div>
      </aside>
    </div>}
  </>;
}
