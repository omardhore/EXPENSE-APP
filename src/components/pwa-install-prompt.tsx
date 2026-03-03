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

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!isMounted || !deferredPrompt) {
    return null;
  }

  const handleInstallClick = async () => {
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
