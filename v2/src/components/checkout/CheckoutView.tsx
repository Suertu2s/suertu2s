"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatClp } from "@/data/packs";
import { useCatalog } from "@/hooks/useCatalog";
import { isReferralCodeLocked, readReferralCode } from "@/lib/referral/storage";
import type { PaymentProvider } from "@/lib/db/types";
import { getCartSubtotal, getHydratedItems, useCart } from "@/store/cart";
import { ReferralBox } from "./ReferralBox";

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="w-[18px] h-[18px]"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function CartQtyControls({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Restar uno"
        onClick={onDecrease}
        className="w-9 h-9 rounded-md border border-white/15 bg-transparent text-white text-base cursor-pointer hover:border-brand-gold/50"
      >
        −
      </button>
      <span className="min-w-[1.75rem] text-center text-white font-bold text-sm">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Sumar uno"
        onClick={onIncrease}
        className="w-9 h-9 rounded-md border border-white/15 bg-transparent text-white text-base cursor-pointer hover:border-brand-gold/50"
      >
        +
      </button>
    </div>
  );
}

function CartRemoveButton({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Eliminar ${name}`}
      title="Eliminar del carrito"
      onClick={onRemove}
      className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-lg border border-red-400/25 bg-red-500/10 text-red-300 cursor-pointer hover:bg-red-500/20 hover:border-red-400/50 transition-colors"
    >
      <TrashIcon />
    </button>
  );
}

export function CheckoutView() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const removeItem = useCart((s) => s.removeItem);
  const setQuantity = useCart((s) => s.setQuantity);
  const {
    packs,
    payments,
    acceptsOrders,
    loaded: catalogLoaded,
  } = useCatalog();
  const hydrated = useMemo(
    () => getHydratedItems(items, packs),
    [items, packs],
  );
  const subtotal = useMemo(() => getCartSubtotal(items, packs), [items, packs]);
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralName, setReferralName] = useState("");
  const [referralLocked, setReferralLocked] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>("flow");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableProviders = useMemo(() => {
    const list: Array<PaymentProvider> = [];
    if (payments.flow) list.push("flow");
    if (payments.mock) list.push("mock");
    return list;
  }, [payments]);

  const canPay =
    acceptPrivacy &&
    acceptTerms &&
    acceptAge &&
    acceptsOrders &&
    availableProviders.includes(provider);

  useEffect(() => {
    setMounted(true);
    const saved = readReferralCode();
    if (saved) setReferralCode(saved);
    setReferralLocked(isReferralCodeLocked());
  }, []);

  useEffect(() => {
    if (!catalogLoaded) return;
    setProvider((current) =>
      availableProviders.includes(current) ? current : payments.defaultProvider,
    );
  }, [catalogLoaded, availableProviders, payments.defaultProvider]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!acceptsOrders) {
      setError(
        "El sorteo ya está cerrado. No se pueden realizar nuevas compras.",
      );
      return;
    }

    if (!acceptPrivacy || !acceptTerms || !acceptAge) {
      setError(
        "Debes aceptar la política de privacidad, las bases del sorteo y confirmar que eres mayor de 18 años.",
      );
      return;
    }

    if (!availableProviders.includes(provider)) {
      setError("Elige un método de pago válido.");
      return;
    }

    setLoading(true);

    const localName = email.split("@")[0] || "Participante";
    const lockedCode = referralLocked ? readReferralCode() : null;
    const codeToSend = (lockedCode || referralCode).trim() || undefined;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: localName,
          rut: "s/n",
          phone: "s/n",
          provider,
          referralCode: codeToSend,
          referralName: referralLocked
            ? undefined
            : referralName.trim() || undefined,
          items: hydrated.map((i) => ({
            packId: i.packId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudo procesar el pedido");

      if (data.method === "webpay_form" && data.token && data.redirectUrl) {
        const formEl = document.createElement("form");
        formEl.method = "POST";
        formEl.action = data.redirectUrl;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = data.token;
        formEl.appendChild(input);
        document.body.appendChild(formEl);
        clear();
        formEl.submit();
        return;
      }

      clear();
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <main className="max-w-[720px] mx-auto px-4 py-16 text-center text-brand-muted text-sm">
        Cargando pedido…
      </main>
    );
  }

  if (!hydrated.length) {
    return (
      <main className="max-w-[500px] mx-auto py-10 md:py-20 px-4">
        <div className="bg-brand-bgLight/80 border border-[#f7c64b]/20 p-8 md:p-10 rounded-3xl text-center space-y-4">
          <h1 className="font-title text-[22px] font-black text-white m-0">
            Tu carrito está vacío
          </h1>
          <p className="text-[#d8c28a] text-sm m-0">
            Elige un pack de ilustración para continuar con tu pedido.
          </p>
          <Link
            href="/#comprar"
            className="btn-header-comprar inline-flex bg-gradient-to-r from-[#f7c64b] to-[#b87817] text-black font-extrabold uppercase text-[13px] px-6 py-3 rounded-full no-underline"
          >
            Elegir pack
          </Link>
        </div>
      </main>
    );
  }

  const priceLabel = formatClp(subtotal).replace(/\s/g, "");

  return (
    <main className="w-full max-w-[720px] mx-auto px-4 pt-8 pb-16 md:pt-12 md:pb-20">
      <form onSubmit={onSubmit} className="space-y-10">
        <section
          className="rounded-xl px-5 py-6 sm:px-8 sm:py-8"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.01)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          }}
        >
          <h1 className="m-0 mb-6 font-sans text-[22px] sm:text-[24px] font-bold text-white">
            Detalles de facturación
          </h1>

          <label className="block mb-5">
            <span className="block mb-2 text-[14px] font-semibold text-white/80">
              Correo electrónico
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-4 py-[0.8rem] text-[15px] text-white outline-none transition-all"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#f7c64b";
                e.currentTarget.style.boxShadow =
                  "0 0 8px rgba(247,198,75,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
              autoComplete="email"
            />
          </label>

          <ReferralBox
            code={referralCode}
            nameQuery={referralName}
            locked={referralLocked}
            onCodeChange={(value) => {
              if (referralLocked) return;
              setReferralCode(value);
            }}
            onNameChange={setReferralName}
          />
        </section>

        {/* Tu pedido */}
        <section>
          <h2 className="m-0 mb-5 font-sans text-[22px] sm:text-[24px] font-bold text-white">
            Tu pedido
          </h2>

          <div
            className="rounded-xl"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Móvil: tarjetas (evita cortar botones) */}
            <ul className="sm:hidden m-0 p-0 list-none divide-y divide-white/5">
              {hydrated.map((item) => {
                const lineTotal = item.pack.priceClp * item.quantity;
                return (
                  <li key={item.packId} className="p-4 space-y-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 font-semibold text-white text-[15px] leading-snug">
                          {item.pack.name}
                        </p>
                        <p className="m-0 mt-1 text-[12px] text-white/50">
                          {formatClp(item.pack.priceClp)} · +
                          {item.pack.ticketCount} ticket
                          {item.pack.ticketCount > 1 ? "s" : ""} gratis
                        </p>
                      </div>
                      <CartRemoveButton
                        name={item.pack.name}
                        onRemove={() => removeItem(item.packId)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <CartQtyControls
                        quantity={item.quantity}
                        onDecrease={() =>
                          setQuantity(item.packId, item.quantity - 1)
                        }
                        onIncrease={() =>
                          setQuantity(item.packId, item.quantity + 1)
                        }
                      />
                      <div className="text-right shrink-0">
                        <p className="m-0 text-[10px] uppercase tracking-wide text-[#f7c64b] font-bold">
                          Subtotal
                        </p>
                        <p className="m-0 text-white font-bold text-[15px]">
                          {formatClp(lineTotal).replace(/\s/g, "")}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Escritorio: tabla */}
            <table className="hidden sm:table w-full border-collapse text-left">
              <thead>
                <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                  <th className="px-5 py-[1.1rem] text-[13px] font-bold uppercase tracking-[0.08em] text-[#f7c64b]">
                    Producto
                  </th>
                  <th className="px-3 py-[1.1rem] text-[13px] font-bold uppercase tracking-[0.08em] text-[#f7c64b] text-center">
                    Cant.
                  </th>
                  <th className="px-5 py-[1.1rem] text-[13px] font-bold uppercase tracking-[0.08em] text-[#f7c64b] text-right">
                    Subtotal
                  </th>
                  <th className="w-14 px-3 py-[1.1rem]" aria-label="Quitar" />
                </tr>
              </thead>
              <tbody>
                {hydrated.map((item) => {
                  const lineTotal = item.pack.priceClp * item.quantity;
                  return (
                    <tr key={item.packId} className="border-b border-white/5">
                      <td className="px-5 py-[1.1rem] text-[15px] text-white/90">
                        <div className="font-semibold text-white">
                          {item.pack.name}
                        </div>
                        <div className="text-[12px] text-white/50 mt-0.5">
                          {formatClp(item.pack.priceClp)} · +
                          {item.pack.ticketCount} ticket
                          {item.pack.ticketCount > 1 ? "s" : ""} gratis
                        </div>
                      </td>
                      <td className="px-3 py-[1.1rem] text-center">
                        <CartQtyControls
                          quantity={item.quantity}
                          onDecrease={() =>
                            setQuantity(item.packId, item.quantity - 1)
                          }
                          onIncrease={() =>
                            setQuantity(item.packId, item.quantity + 1)
                          }
                        />
                      </td>
                      <td className="px-5 py-[1.1rem] text-[15px] text-white font-bold text-right whitespace-nowrap">
                        {formatClp(lineTotal).replace(/\s/g, "")}
                      </td>
                      <td className="px-3 py-[1.1rem] text-right">
                        <CartRemoveButton
                          name={item.pack.name}
                          onRemove={() => removeItem(item.packId)}
                        />
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-b border-white/5">
                  <td
                    colSpan={2}
                    className="px-5 py-4 text-right text-[13px] font-bold uppercase tracking-[0.08em] text-[#f7c64b]"
                  >
                    Subtotal
                  </td>
                  <td className="px-5 py-4 text-[15px] text-white font-bold text-right whitespace-nowrap">
                    {priceLabel}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-4 text-right text-[13px] font-bold uppercase tracking-[0.08em] text-[#f7c64b]"
                  >
                    Total
                  </td>
                  <td className="px-5 py-4 text-[15px] text-white font-bold text-right whitespace-nowrap">
                    {priceLabel}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>

            {/* Totales móvil */}
            <div className="sm:hidden border-t border-white/5 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#f7c64b] font-bold uppercase tracking-wide">
                  Subtotal
                </span>
                <span className="text-white font-bold">{priceLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-base">
                <span className="text-[#f7c64b] font-bold uppercase tracking-wide">
                  Total
                </span>
                <span className="text-white font-bold">{priceLabel}</span>
              </div>
            </div>
          </div>

          {!acceptsOrders && (
            <div className="mt-5 rounded-[14px] px-[18px] py-[14px] border border-red-400/40 bg-red-500/10 text-red-200 text-sm font-semibold">
              La campaña de premiación ya está cerrada. No se pueden realizar
              nuevas compras.
            </div>
          )}

          {acceptsOrders && availableProviders.length > 0 && (
            <fieldset className="mt-5 space-y-3 m-0 p-0 border-0">
              <legend className="text-[14px] font-bold text-white mb-2 px-0">
                Método de pago
              </legend>
              {payments.flow && (
                <label
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-[14px] px-4 sm:px-[18px] py-[14px] cursor-pointer border ${
                    provider === "flow"
                      ? "border-[#36f073]/70 bg-[rgba(13,17,14,0.9)]"
                      : "border-white/10 bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="payment-provider"
                      checked={provider === "flow"}
                      onChange={() => setProvider("flow")}
                      className="accent-[#36f073] shrink-0"
                    />
                    <span className="text-white text-[15px] font-bold">
                      Flow.cl
                    </span>
                  </span>
                  <span className="text-[12px] text-brand-muted font-semibold pl-7 sm:pl-0">
                    Webpay, Servipag y tarjetas
                  </span>
                </label>
              )}
              {payments.mock && (
                <label
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-[14px] px-4 sm:px-[18px] py-[14px] cursor-pointer border ${
                    provider === "mock"
                      ? "border-brand-gold/60 bg-[rgba(13,17,14,0.9)]"
                      : "border-white/10 bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="payment-provider"
                      checked={provider === "mock"}
                      onChange={() => setProvider("mock")}
                      className="accent-[#f7c64b] shrink-0"
                    />
                    <span className="text-white text-[15px] font-bold">
                      Pago de prueba
                    </span>
                  </span>
                  <span className="text-[12px] text-brand-muted font-semibold pl-7 sm:pl-0">
                    Solo desarrollo
                  </span>
                </label>
              )}
            </fieldset>
          )}

          {acceptsOrders && availableProviders.length === 0 && (
            <div className="mt-5 rounded-[14px] px-[18px] py-[14px] border border-brand-gold/40 bg-brand-gold/10 text-brand-cream text-sm">
              No hay métodos de pago configurados todavía. Falta conectar
              Flow.cl.
            </div>
          )}

          <p className="mt-5 mb-0 text-[14px] leading-relaxed text-white/75">
            Tus datos personales se utilizarán para procesar tu pedido, mejorar
            tu experiencia en esta web y otros propósitos descritos en nuestra{" "}
            <Link
              href="/bases-legales"
              className="text-[#f7c64b] underline underline-offset-2 hover:text-[#36f073]"
            >
              política de privacidad
            </Link>
            .
          </p>

          <div className="mt-5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer text-[14px] text-white/85 leading-snug">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                required
                className="mt-1 w-4 h-4 accent-[#36f073] shrink-0"
              />
              <span>
                He leído y acepto la{" "}
                <Link
                  href="/bases-legales"
                  className="text-[#f7c64b] underline underline-offset-2 hover:text-[#36f073]"
                >
                  política de privacidad
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer text-[14px] text-white/85 leading-snug">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
                className="mt-1 w-4 h-4 accent-[#36f073] shrink-0"
              />
              <span>
                Acepto las{" "}
                <Link
                  href="/bases-legales"
                  className="text-[#f7c64b] underline underline-offset-2 hover:text-[#36f073]"
                >
                  bases legales del sorteo
                </Link>{" "}
                y las condiciones de participación.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer text-[14px] text-white/85 leading-snug">
              <input
                type="checkbox"
                checked={acceptAge}
                onChange={(e) => setAcceptAge(e.target.checked)}
                required
                className="mt-1 w-4 h-4 accent-[#36f073] shrink-0"
              />
              <span>
                Declaro ser mayor de 18 años y que mis datos son correctos.
              </span>
            </label>
          </div>

          {error && (
            <p className="mt-4 mb-0 text-red-300 text-sm border border-red-400/30 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={loading || !canPay}
              className="w-full sm:w-auto min-w-[280px] text-black font-extrabold uppercase text-[14px] border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(to right, #f7c64b, #b87817)",
                padding: "1.1rem 2.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 14px rgba(247,198,75,0.3)",
              }}
              onMouseEnter={(e) => {
                if (loading || !canPay) return;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(247,198,75,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(247,198,75,0.3)";
              }}
            >
              {loading ? "Procesando..." : "Realizar el pedido"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
