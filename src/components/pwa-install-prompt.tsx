"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile automatically
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: If not matched organically, try to grab from window
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  // Only hide perfectly if we guarantee they can't install, but PWA logic is tricky 
  // Let's just render the button if the PWA feature generally exists.
  // Actually, we'll try to let standard mobile users try it.

  const handleInstallClick = async () => {
    if (!deferredPrompt && 'serviceWorker' in navigator) {
       // Check if they are on iOS Safari where install prompts are physically blocked by Apple
       const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
       
       if (isIos) {
         alert("To install on iPhone: Tap the Share button at the bottom of Safari, then scroll down and tap 'Add to Home Screen'.");
       } else {
         alert("To install: Tap the 3 dots (⋮) in the top-right corner of Chrome, then tap 'Install app' or 'Add to homescreen'.");
       }
       return;
    }
    
    if (!deferredPrompt) return;
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }
    
    // Clear the deferredPrompt since it can only be used once
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <Button 
        onClick={handleInstallClick}
        className="rounded-full shadow-2xl border-2 border-[var(--brand-secondary)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white flex items-center gap-3 px-6 py-6"
      >
        <Download className="w-5 h-5 text-[var(--brand-secondary)]" />
        <span className="font-semibold text-base tracking-wide">Install App</span>
      </Button>
    </div>
  );
}
