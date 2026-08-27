"use client";

import { useEffect, useState } from "react";

type Mode = "code" | "name";

type AffiliateResult = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  code: string;
  nameQuery: string;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  /** Código capturado por QR / ?ref= — no se puede borrar ni editar. */
  locked?: boolean;
};

function MegaphoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 11v2a1 1 0 0 0 1 1h2l5 3V7L6 10H4a1 1 0 0 0-1 1Z"
        fill="#3B82F6"
      />
      <path
        d="M16 8.5c1.2.9 2 2.1 2 3.5s-.8 2.6-2 3.5"
        stroke="#3B82F6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18.5 6.5C20.5 8 21.5 10 21.5 12s-1 4-3 5.5"
        stroke="#3B82F6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="#3B82F6" strokeWidth="2" />
      <path
        d="M16 16l4.5 4.5"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ReferralBox({
  code,
  nameQuery,
  onCodeChange,
  onNameChange,
  locked = false,
}: Props) {
  const [mode, setMode] = useState<Mode>("code");
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [nameResults, setNameResults] = useState<AffiliateResult[]>([]);
  const [nameStatus, setNameStatus] = useState<
    "idle" | "searching" | "found" | "none" | "many"
  >("idle");

  useEffect(() => {
    if (locked || !code.trim()) {
      setCodeStatus("idle");
      return;
    }

    const timer = window.setTimeout(async () => {
      setCodeStatus("checking");
      try {
        const res = await fetch("/api/affiliates/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });
        const data = (await res.json()) as { valid?: boolean };
        setCodeStatus(data.valid ? "valid" : "invalid");
      } catch {
        setCodeStatus("idle");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [code, locked]);

  useEffect(() => {
    if (locked || mode !== "name" || nameQuery.trim().length < 2) {
      setNameResults([]);
      setNameStatus("idle");
      return;
    }

    const timer = window.setTimeout(async () => {
      setNameStatus("searching");
      try {
        const res = await fetch(
          `/api/affiliates/search?q=${encodeURIComponent(nameQuery.trim())}`,
        );
        const data = (await res.json()) as { results?: AffiliateResult[] };
        const results = data.results || [];
        setNameResults(results);
        if (results.length === 0) setNameStatus("none");
        else if (results.length > 1) setNameStatus("many");
        else setNameStatus("found");
      } catch {
        setNameStatus("idle");
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [nameQuery, mode, locked]);

  function pickAffiliate(aff: AffiliateResult) {
    onCodeChange(aff.code);
    onNameChange(aff.name);
    setNameResults([]);
    setMode("code");
    setCodeStatus("valid");
  }

  return (
    <div
      className="suertudos-referral-container rounded-2xl p-4 sm:p-5 space-y-3.5"
      style={{
        backgroundColor: "rgba(7, 22, 11, 0.6)",
        border: "1px solid rgba(54, 240, 115, 0.25)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[15px] sm:text-[16px] font-semibold text-[#36f073] leading-snug">
          <span className="mr-1.5" aria-hidden>
            💛
          </span>
          {locked
            ? "Te refirió un embajador"
            : "¿Te refirió un embajador o vendedor?"}
        </p>
        <span
          className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{
            color: locked ? "#36f073" : "#f7c64b",
            backgroundColor: "rgba(0,0,0,0.45)",
            border: locked
              ? "1px solid rgba(54, 240, 115, 0.4)"
              : "1px solid rgba(247, 198, 75, 0.35)",
          }}
        >
          {locked ? (
            <>
              <LockIcon />
              Desde QR
            </>
          ) : (
            "Opcional"
          )}
        </span>
      </div>

      {!locked && (
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`suertudos-ref-tab-btn inline-flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-bold cursor-pointer transition-colors border ${
              mode === "code"
                ? "bg-[#f7c64b] text-black border-[#f7c64b]"
                : "bg-[rgba(0,0,0,0.35)] text-white border-white/15 hover:border-white/30"
            }`}
          >
            <MegaphoneIcon />
            Por Código
          </button>
          <button
            type="button"
            onClick={() => setMode("name")}
            className={`suertudos-ref-tab-btn inline-flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-bold cursor-pointer transition-colors border ${
              mode === "name"
                ? "bg-[#f7c64b] text-black border-[#f7c64b]"
                : "bg-[rgba(0,0,0,0.35)] text-white border-white/15 hover:border-white/30"
            }`}
          >
            <SearchIcon />
            Buscar por Nombre
          </button>
        </div>
      )}

      {locked || mode === "code" ? (
        <label className="block space-y-2">
          <span className="block text-[14px] text-white/90 font-normal">
            {locked
              ? "Código del embajador (aplicado desde el QR)"
              : "Ingresa el código del embajador (ej: STJP48)"}
          </span>
          <input
            id="suertudos_ref_code_input"
            type="text"
            value={code}
            onChange={(e) => {
              if (locked) return;
              onCodeChange(e.target.value.toUpperCase());
            }}
            readOnly={locked}
            placeholder="EJ: STJP48"
            className={`w-full h-12 rounded-xl px-4 text-[15px] text-white outline-none ${
              locked ? "cursor-not-allowed opacity-90" : ""
            }`}
            style={{
              backgroundColor: locked
                ? "rgba(54, 240, 115, 0.08)"
                : "rgba(0, 0, 0, 0.4)",
              border: locked
                ? "1px solid rgba(54, 240, 115, 0.35)"
                : codeStatus === "invalid"
                  ? "1px solid rgba(239, 68, 68, 0.6)"
                  : codeStatus === "valid"
                    ? "1px solid rgba(54, 240, 115, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.15)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              letterSpacing: "1.5px",
            }}
            autoComplete="off"
            aria-readonly={locked || undefined}
          />
          {locked && (
            <p className="m-0 text-[12px] text-white/55">
              Este código no se puede borrar porque llegaste con el QR del
              afiliado.
            </p>
          )}
          {!locked && code.trim() && codeStatus === "checking" && (
            <p className="m-0 text-[12px] text-white/50">Verificando código…</p>
          )}
          {!locked && code.trim() && codeStatus === "invalid" && (
            <p className="m-0 text-[12px] text-red-300">
              Código no válido o embajador inactivo.
            </p>
          )}
          {!locked && code.trim() && codeStatus === "valid" && (
            <p className="m-0 text-[12px] text-[#36f073]">
              Código verificado correctamente.
            </p>
          )}
        </label>
      ) : (
        <div className="block space-y-2">
          <label className="block space-y-2">
            <span className="block text-[14px] text-white/90 font-normal">
              Busca el nombre del embajador o vendedor
            </span>
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full h-12 rounded-xl px-4 text-[15px] text-white outline-none"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
              autoComplete="off"
            />
          </label>
          {nameStatus === "searching" && (
            <p className="m-0 text-[12px] text-white/50">Buscando…</p>
          )}
          {nameStatus === "none" && (
            <p className="m-0 text-[12px] text-red-300">
              No encontramos embajadores con ese nombre.
            </p>
          )}
          {nameStatus === "many" && nameResults.length > 0 && (
            <ul className="m-0 p-0 list-none space-y-1.5">
              {nameResults.map((aff) => (
                <li key={aff.id}>
                  <button
                    type="button"
                    onClick={() => pickAffiliate(aff)}
                    className="w-full text-left rounded-lg px-3 py-2.5 bg-black/40 border border-white/10 text-white text-sm hover:border-[#36f073]/40 cursor-pointer"
                  >
                    <span className="font-semibold">{aff.name}</span>
                    <span className="ml-2 font-mono text-[#f7c64b] text-xs">
                      {aff.code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {nameStatus === "found" && nameResults[0] && (
            <button
              type="button"
              onClick={() => pickAffiliate(nameResults[0])}
              className="text-[12px] text-[#36f073] bg-transparent border-none cursor-pointer p-0 underline"
            >
              Usar {nameResults[0].name} ({nameResults[0].code})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
