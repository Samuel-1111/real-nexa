"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIos(isIOS);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallEvent(promptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setInstallEvent(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      setVisible(false);
      return;
    }

    if (ios) {
      window.alert("On iPhone or iPad: tap Share in your browser, then choose “Add to Home Screen”.");
    }
  }

  if (!visible) return null;

  return (
    <aside className="installBanner" role="dialog" aria-label="Install NEXA">
      <div className="installIcon" aria-hidden="true">N</div>
      <div className="installCopy">
        <strong>Install NEXA</strong>
        <span>{ios ? "Add NEXA to your Home Screen for an app-like experience." : "Add NEXA to your Home Screen for faster access."}</span>
      </div>
      <button className="installButton" onClick={install}>
        {ios ? "How to install" : "Install"}
      </button>
      <button className="installClose" onClick={() => setVisible(false)} aria-label="Close install prompt">×</button>
    </aside>
  );
}
