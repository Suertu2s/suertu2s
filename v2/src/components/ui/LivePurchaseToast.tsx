"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type PurchaseItem = {
  id: string;
  name: string;
  location: string;
  packName: string;
  tickets: number;
  image: string;
  timeAgo: string;
};

const FIRST_NAMES = [
  "Raúl",
  "Camila",
  "Diego",
  "Javiera",
  "Matías",
  "Francisca",
  "Gonzalo",
  "Valentina",
  "Rodrigo",
  "Sofía",
  "Cristian",
  "Ignacia",
  "Felipe",
  "Daniela",
  "Andrés",
  "Constanza",
  "Sebastián",
  "Macarena",
  "Tomás",
  "Paulina",
  "Nicolás",
  "Carolina",
  "Joaquín",
  "Isidora",
  "Maximiliano",
  "Florencia",
  "Benjamín",
  "Antonia",
  "Lucas",
  "Josefa",
  "Gabriel",
  "Catalina",
  "Alejandro",
  "Fernanda",
  "Eduardo",
  "Bárbara",
  "Ignacio",
  "Pía",
  "Álvaro",
  "Victoria",
];

const LAST_INITIALS = [
  "M.",
  "S.",
  "V.",
  "P.",
  "R.",
  "L.",
  "A.",
  "T.",
  "C.",
  "B.",
  "F.",
  "N.",
  "G.",
  "H.",
  "D.",
  "O.",
  "E.",
  "Z.",
  "K.",
  "U.",
];

const LOCATIONS = [
  "Puerto Montt",
  "Puerto Varas",
  "Castro",
  "Osorno",
  "Valdivia",
  "Temuco",
  "Ancud",
  "Frutillar",
  "Llanquihue",
  "Calbuco",
  "Concepción",
  "Los Ángeles",
  "Villarrica",
  "Pucón",
  "Santiago",
  "Rancagua",
  "Talca",
  "La Serena",
  "Chillán",
  "Punta Arenas",
  "Coyhaique",
  "Fresia",
  "Purranque",
  "Quellón",
];

const PACKS_DATA = [
  {
    packName: "Ilustración Puerto Montt",
    tickets: 1,
    image: "/images/packs/puertomontt.webp",
  },
  {
    packName: "Ilustración Llanquihue",
    tickets: 2,
    image: "/images/packs/llanquihue.webp",
  },
  {
    packName: "Ilustración Chiloé",
    tickets: 3,
    image: "/images/packs/chiloe.webp",
  },
];

const TIME_AGOS = [
  "Hace un momento",
  "Hace 1 min",
  "Hace 2 min",
  "Hace 3 min",
  "Hace 4 min",
  "Hace 5 min",
  "Hace 6 min",
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomPurchase(): PurchaseItem {
  const firstName = getRandomElement(FIRST_NAMES);
  const lastInitial = getRandomElement(LAST_INITIALS);
  const location = getRandomElement(LOCATIONS);
  const pack = getRandomElement(PACKS_DATA);
  const timeAgo = getRandomElement(TIME_AGOS);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${firstName} ${lastInitial}`,
    location,
    packName: pack.packName,
    tickets: pack.tickets,
    image: pack.image,
    timeAgo,
  };
}

export function LivePurchaseToast() {
  const pathname = usePathname();
  const [current, setCurrent] = useState<PurchaseItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const showCountRef = useRef(0);

  const hidden = useMemo(
    () =>
      pathname.startsWith("/admin") ||
      pathname.startsWith("/afiliados") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/pago"),
    [pathname],
  );

  useEffect(() => {
    if (hidden || dismissed) return;

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const scheduleNext = () => {
      if (!isMounted) return;

      const purchase = generateRandomPurchase();
      setCurrent(purchase);
      setVisible(true);
      showCountRef.current += 1;

      // Tiempo que permanece visible en pantalla (4.2 segundos)
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        setVisible(false);

        // Si es la primera compra, la segunda aparece rápido (2.5 a 3.5s)
        // para que el visitante observe al menos 2 compras al entrar.
        // Posterior a las primeras 2, entra en ritmo regular (7s a 12s).
        let nextInterval: number;
        if (showCountRef.current < 2) {
          nextInterval = 2500 + Math.random() * 1000;
        } else {
          nextInterval = 7000 + Math.random() * 5000;
        }

        timeoutId = setTimeout(scheduleNext, nextInterval);
      }, 4200);
    };

    // Primera aparición rápida al entrar a la página (1.8 segundos)
    timeoutId = setTimeout(scheduleNext, 1800);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [hidden, dismissed]);

  if (hidden || !current) return null;

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
        {/* Imagen miniatura del pack comprado */}
        <div className="relative size-11 sm:size-12 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10 p-0.5">
          <Image
            src={current.image}
            alt=""
            fill
            sizes="48px"
            className="object-contain"
          />
          {/* Indicador pulsante verde */}
          <span className="absolute top-1 right-1 flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36f073] opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-[#36f073]" />
          </span>
        </div>

        {/* Información del comprador y tickets */}
        <div className="flex-1 min-w-0 pr-1 leading-tight">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="m-0 text-[12px] sm:text-[13px] font-extrabold text-white truncate">
              {current.name}
            </p>
            <span className="text-[10px] text-white/50">
              de {current.location}
            </span>
          </div>

          <p className="m-0 mt-0.5 text-[11px] sm:text-[12px] font-medium text-[#d8c28a] leading-tight">
            Compró{" "}
            <span className="font-extrabold text-[#36f073]">
              +{current.tickets} ticket{current.tickets > 1 ? "s" : ""}
            </span>{" "}
            <span className="text-white/60">({current.packName})</span>
          </p>

          <p className="m-0 mt-1 text-[10px] text-white/40 font-medium">
            {current.timeAgo}
          </p>
        </div>

        {/* Botón cerrar */}
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
