"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type PurchaseItem = {
  id: string;
  name: string;
  packName: string;
  tickets: number;
  image: string;
  timeAgo: string;
};

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export function LivePurchaseToast() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<PurchaseItem[]>([]);
  const [current, setCurrent] = useState<PurchaseItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const indexRef = useRef(0);

  const hidden = useMemo(
    () =>
      pathname.startsWith("/admin") ||
      pathname.startsWith("/afiliados") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/pago"),
    [pathname],
  );

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/public/recent-purchases", {
          cache: "no-store",
        });
        const data = (await res.json()) as { purchases?: PurchaseItem[] };
        if (
          !cancelled &&
          Array.isArray(data.purchases) &&
          data.purchases.length
        ) {
          setQueue(data.purchases);
        }
      } catch {
        // Sin compras recientes: no mostrar toast
      }
    };

    void load();
    const refresh = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden || dismissed || queue.length === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const showNext = () => {
      if (!isMounted || queue.length === 0) return;
      const item = queue[indexRef.current % queue.length]!;
      indexRef.current += 1;
      setCurrent(item);
      setVisible(true);

      timeoutId = setTimeout(
        () => {
          if (!isMounted) return;
          setVisible(false);
          timeoutId = setTimeout(showNext, randomBetween(10000, 22000));
        },
        randomBetween(4000, 6500),
      );
    };

    timeoutId = setTimeout(showNext, randomBetween(5000, 14000));
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [hidden, dismissed, queue]);

  if (hidden || !current || queue.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[1100] max-w-[calc(100vw-2rem)] sm:max-w-[340px] transition-all duration-500 ease-out pointer-events-auto select-none ${
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-4 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#07130a]/94 backdrop-blur-lg border border-[#36f073]/25 shadow-[0_12px_36px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
        <div className="relative size-11 sm:size-12 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10 p-0.5">
          <Image
            src={current.image}
            alt=""
            fill
            sizes="48px"
            className="object-contain"
          />
          <span className="absolute top-1 right-1 flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36f073] opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-[#36f073]" />
          </span>
        </div>

        <div className="flex-1 min-w-0 pr-1 leading-tight">
          <p className="m-0 text-[12px] sm:text-[13px] font-extrabold text-white truncate">
            Actividad reciente
          </p>
          <p className="m-0 mt-0.5 text-[11px] sm:text-[12px] font-medium text-[#d8c28a] leading-tight">
            {current.name} eligió{" "}
            <span className="font-extrabold text-[#36f073]">
              +{current.tickets} ticket{current.tickets > 1 ? "s" : ""}
            </span>{" "}
            <span className="text-white/60">({current.packName})</span>
          </p>
          <p className="m-0 mt-1 text-[10px] text-white/40 font-medium">
            {current.timeAgo}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setDismissed(true);
          }}
          aria-label="Cerrar notificación"
          className="shrink-0 p-1 text-white/40 hover:text-white transition-colors cursor-pointer bg-transparent border-none rounded-lg hover:bg-white/10"
        >
          <svg
            className="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
