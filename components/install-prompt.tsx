"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
    if (standalone) { setInstalled(true); return; }

    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    const capture = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const done = () => { setInstalled(true); setVisible(false); setInstallEvent(null); };

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);

    // Keep an install option visible immediately on browsers that do not
    // expose beforeinstallprompt. The browser still controls native install.
    setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
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
    setShowInstructions(true);
  }

  if (installed || !visible) return null;

  return (
    <>
      <aside className="installBanner" role="dialog" aria-label="Install NEXA">
        <div className="installIcon">N</div>
        <div className="installCopy">
          <strong>Install NEXA</strong>
          <span>Use NEXA like a real app on your phone.</span>
        </div>
        <button className="installButton" onClick={() => void install()}>Install</button>
        <button className="installClose" onClick={() => setVisible(false)} aria-label="Close">×</button>
      </aside>

      {showInstructions && (
        <div className="sheetBackdrop" role="dialog" aria-modal="true" aria-label="NEXA installation instructions" onMouseDown={() => setShowInstructions(false)}>
          <aside className="sheet" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 430 }}>
            <div className="sheetHead">
              <h3>Install NEXA</h3>
              <button onClick={() => setShowInstructions(false)} aria-label="Close">×</button>
            </div>
            <div style={{ padding: "8px 20px 28px", lineHeight: 1.6 }}>
              {ios ? (
                <>
                  <strong>iPhone / iPad</strong>
                  <p>Use Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. Confirm <b>Add</b>.</p>
                </>
              ) : (
                <>
                  <strong>Android</strong>
                  <p>If your browser supports PWA installation, this button will open its native <b>Install app</b> prompt.</p>
                  <p>If it does not, open the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
                </>
              )}
              <p style={{ fontSize: 12, opacity: 0.7 }}>
                NEXA is a Progressive Web App. A website cannot force-install an app or force a browser's native prompt where that browser does not provide one. This fallback keeps installation available on unsupported browsers.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
