"use client";

import { useRef, useState } from "react";
import { getAssetPath } from "@/lib/assets";

const FALLBACK_IMAGE = "/suertu2s_moto_hero.jpg";

export function MotorcycleVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);

  const videoSrc = getAssetPath("/moto_fondo_desenfocado.mp4");

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (videoFailed) {
    return (
      <div className="relative w-full max-w-[380px] aspect-square mx-auto">
        <div className="relative aspect-square w-full rounded-[32px] overflow-hidden glass-card border border-white/12 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FALLBACK_IMAGE}
            alt="MOTORRAD CORSA R150 2026"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[380px] aspect-square mx-auto cursor-pointer group">
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-greenBright/30 via-brand-gold/20 to-brand-greenBright/30 rounded-[32px] filter blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="relative aspect-square w-full h-full rounded-[32px] overflow-hidden glass-card border border-white/12 p-2 shadow-xl transition-all duration-500 group-hover:border-brand-greenBright/50 group-hover:shadow-[0_20px_50px_rgba(54,240,115,0.2)]">
        <div className="relative w-full h-full rounded-[24px] overflow-hidden bg-black/90 flex items-center justify-center">
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-40 pointer-events-none"
          />

          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onError={() => setVideoFailed(true)}
            className="relative z-10 w-full h-full object-cover"
          />

          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

          <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
            <button
              onClick={togglePlay}
              type="button"
              className="p-2.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-white hover:text-brand-gold hover:border-brand-gold/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg"
              aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleMute}
              type="button"
              className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-brand-cream text-xs font-title font-semibold hover:border-brand-gold/60 hover:text-brand-gold hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              {isMuted ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-brand-muted"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                  <span>Activar Sonido</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-brand-greenBright"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  <span>Sonido ON</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
