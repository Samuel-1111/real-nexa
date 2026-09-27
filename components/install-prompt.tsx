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
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as NavigatorWithStandalone).standalone);

    if (standalone) {
      setInstalled(true);
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIOS);

    // Register/update the service worker immediately so the browser can
    // recognize NEXA as an installable PWA as early as possible.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    const capture = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const done = () => {
      setInstalled(true);
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);

    // Some browsers do not expose beforeinstallprompt (notably iOS Safari).
    // Show our install control so the user still gets the correct platform
    // instructions instead of being left without an install option.
    const fallbackTimer = window.setTimeout(() => setVisible(true), 1200);

    return () => {
      window.clearTimeout(fallbackTimer);
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
          <span>Add NEXA to your phone like a real app.</span>
        </div>
        <button className="installButton" onClick={() => void install()}>
          Install
        </button>
        <button className="installClose" onClick={() => setVisible(false)} aria-label="Close">
          ×
        </button>
      </aside>

      {showInstructions && (
        <div
          className="sheetBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label="NEXA installation instructions"
          onMouseDown={() => setShowInstructions(false)}
        >
          <aside className="sheet" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 430 }}>
            <div className="sheetHead">
              <h3>Install NEXA</h3>
              <button onClick={() => setShowInstructions(false)} aria-label="Close">×</button>
            </div>
            <div style={{ padding: "8px 20px 28px", lineHeight: 1.6 }}>
              {ios ? (
                <>
                  <strong>iPhone / iPad</strong>
                  <p>Open NEXA in Safari, tap <b>Share</b>, then choose <b>Add to Home Screen</b>.</p>
                </>
              ) : (
                <>
                  <strong>Android / Chrome</strong>
                  <p>If Chrome exposes the native PWA prompt, tap <b>Install</b> and NEXA will be added to your home screen.</p>
                  <p>If your browser does not expose the prompt, open its browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
                </>
              )}
              <p style={{ fontSize: 12, opacity: 0.7 }}>
                NEXA is a Progressive Web App. Browsers control whether the native installation prompt is available; a website cannot force-install an application on a browser that does not support PWA installation.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
