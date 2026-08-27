"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { getCartItemCount, getCartTicketCount, useCart } from "@/store/cart";
import { triggerLuckEffect } from "@/components/ui/GoldenCloverEffect";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/#comprar", label: "Elegir pack" },
  { href: "/#como-jugar", label: "Cómo funciona" },
  { href: "/#faq", label: "Preguntas frecuentes" },
  { href: "/bases-legales", label: "Bases legales" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = mounted ? getCartItemCount(items) : 0;
  const ticketCount = mounted ? getCartTicketCount(items) : 0;

  return (
    <>
      <header
        className={`header-liquid-glass px-3 sm:px-5 py-[12px] box-border max-w-[100vw] ${
          scrolled ? "header-scrolled" : ""
        }`}
      >
        {/* Capa de difuminado (backdrop-filter) */}
        <div className="header-glass-bg" aria-hidden />

        <div className="header-inner max-w-[1200px] w-full mx-auto flex items-center justify-between gap-2 sm:gap-3.5 box-border">
          <Logo size="sm" />

          <nav className="hidden min-[1151px]:flex items-center gap-6 shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-brand-cream no-underline text-[14px] font-semibold m-0 hover:text-brand-greenBright transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <Link
              href="/#comprar"
              onClick={(e) => triggerLuckEffect(e.clientX, e.clientY)}
              className="btn-header-comprar hidden min-[1151px]:inline-flex bg-gradient-to-r from-brand-gold to-brand-goldDark text-black font-sans font-bold text-[13px] uppercase px-[22px] py-[10px] rounded-full no-underline shrink-0 whitespace-nowrap"
            >
              COMPRAR
            </Link>

            <Link
              href="/checkout"
              className="block cursor-pointer transition-all duration-200 hover:scale-110 text-brand-gold hover:text-brand-cream relative shrink-0"
              title="Carrito"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-[24px] h-[24px] sm:w-[26px] sm:h-[26px]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#36f073] text-black text-[10px] font-extrabold flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-[1151px]:hidden items-center justify-center text-brand-gold hover:text-white p-1 bg-transparent border-none cursor-pointer transition-colors shrink-0"
              aria-label="Abrir menú"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-7 h-7 sm:w-8 sm:h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[100000] bg-brand-bg/95 backdrop-blur-md transition-opacity duration-300 flex flex-col items-center justify-center ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-6 right-6 text-brand-gold hover:text-white p-2 bg-transparent border-none cursor-pointer transition-transform duration-200 hover:rotate-90"
          aria-label="Cerrar menú"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <nav className="flex flex-col items-center gap-6 mb-10 w-full px-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`font-title no-underline text-xl font-bold ${
                link.href === "/#comprar"
                  ? "text-brand-greenBright"
                  : "text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/checkout"
          onClick={() => setOpen(false)}
          className="font-sans text-brand-greenBright no-underline text-lg font-semibold flex items-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6 text-brand-greenBright"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 110 4 2 2 0 010-4z"
            />
          </svg>
          Ir al pago ({ticketCount} tickets)
        </Link>
      </div>
    </>
  );
}
