"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type NavigatorWithStandalone = Navigator & { standalone?: boolean };
type Platform = "android" | "ios" | "windows" | null;

const ANDROID_APK = "https://github.com/Samuel-1111/real-nexa/releases/latest/download/NEXA.apk";

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (/NEXA-Android\//i.test(navigator.userAgent)) { setInstalled(true); return; }
    const ua = navigator.userAgent.toLowerCase();
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
    if (standalone) { setInstalled(true); return; }
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/windows/.test(ua)) setPlatform("windows");
    else setPlatform("android");

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => undefined);

    const capture = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent); setVisible(true); };
    const done = () => { setInstalled(true); setVisible(false); setInstallEvent(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    setVisible(true);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); };
  }, []);

  async function installPwa() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      setVisible(false);
      return;
    }
    setShowInstructions(true);
  }

  function choose(p: Exclude<Platform, null>) {
    setPlatform(p);
    if (p === "android" && installEvent) { void installPwa(); return; }
    setShowInstructions(true);
  }

  if (installed || !visible) return null;

  return (
    <>
      <section className="installBanner" role="region" aria-label="Get NEXA on your device">
        <div className="installIcon">N</div>
        <div className="installCopy"><strong>Get NEXA</strong><span>Your personal assistant, installed like a real app.</span></div>
        <div className="installPlatforms">
          <button className="installButton" onClick={() => choose("android")}>Android</button>
          <button className="installButton" onClick={() => choose("ios")}>iPhone / iPad</button>
          <button className="installButton" onClick={() => choose("windows")}>Windows</button>
        </div>
        <button className="installClose" onClick={() => setVisible(false)} aria-label="Close">×</button>
      </section>

      {showInstructions && (
        <div className="sheetBackdrop" role="dialog" aria-modal="true" aria-label="NEXA installation options" onMouseDown={() => setShowInstructions(false)}>
          <aside className="sheet" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="sheetHead"><h3>Install NEXA</h3><button onClick={() => setShowInstructions(false)} aria-label="Close">×</button></div>
            <div style={{ padding: "8px 20px 28px", lineHeight: 1.6 }}>
              {platform === "android" ? <>
                <strong>Android</strong>
                <p>Use the browser's <b>Install app</b> prompt when available to install NEXA as a PWA.</p>
                <p>There is also a direct Android APK:</p>
                <a className="installButton" href={ANDROID_APK} target="_blank" rel="noreferrer">Download NEXA APK</a>
              </> : platform === "ios" ? <>
                <strong>iPhone / iPad</strong>
                <p>Open NEXA in <b>Safari</b>, tap <b>Share</b>, choose <b>Add to Home Screen</b>, then confirm <b>Add</b>.</p>
                <p>This installs NEXA as a standalone PWA without the App Store.</p>
              </> : <>
                <strong>Windows</strong>
                <p>Open NEXA in Microsoft Edge or Chrome and choose <b>Install NEXA</b> when offered.</p>
                <p>If it is not shown, use the browser menu and select <b>Install app</b>.</p>
              </>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
