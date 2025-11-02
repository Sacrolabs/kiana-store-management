"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number; // Minimum display time in milliseconds
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFading(true);

      // Wait for fade animation to complete
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500); // Match the CSS transition duration
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#3b82f6] transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* App Icon with pulse animation */}
      <div className="relative mb-8 animate-in fade-in zoom-in duration-700">
        <div className="absolute inset-0 animate-pulse rounded-full bg-white/20 blur-2xl" />
        <div className="relative">
          <Image
            src="/icon-192x192.png"
            alt="Kiana Food Company"
            width={120}
            height={120}
            className="rounded-3xl shadow-2xl"
            priority
          />
        </div>
      </div>

      {/* App Name */}
      <h1 className="mb-2 text-3xl font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        Kiana Food Company
      </h1>

      <p className="mb-8 text-sm text-white/80 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        Powered by Blazecode.io
      </p>

      {/* Loading Spinner */}
      <div className="flex items-center justify-center animate-in fade-in duration-700 delay-500">
        <div className="relative h-8 w-8">
          <div className="absolute h-full w-full animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </div>

      {/* Optional loading dots */}
      <div className="mt-4 flex space-x-2 animate-in fade-in duration-700 delay-700">
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-white/60"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-white/60"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-white/60"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
