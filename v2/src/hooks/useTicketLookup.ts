"use client";

import { useCallback, useEffect, useState } from "react";

export type LookupTicket = {
  code: string;
  number: number;
  orderId: string;
  createdAt?: string;
};

type LookupPhase = "email" | "sent" | "verified";

export function useTicketLookup(initialToken?: string | null) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<LookupPhase>("email");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<LookupTicket[] | null>(null);

  const verifyToken = useCallback(async (token: string) => {
    setStatus("loading");
    setMessage("");
    setTickets(null);
    try {
      const res = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as {
        tickets?: LookupTicket[];
        error?: string;
        email?: string;
      };
      if (res.ok && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        setPhase("verified");
        setStatus("done");
        if (data.email) setEmail(data.email);
        setMessage(
          data.tickets.length > 0
            ? `Encontramos ${data.tickets.length} código${
                data.tickets.length > 1 ? "s" : ""
              }.`
            : "No encontramos códigos activos para este enlace.",
        );
      } else {
        setStatus("error");
        setMessage(
          data.error ||
            "El enlace expiró o no es válido. Solicita uno nuevo con tu correo.",
        );
      }
    } catch {
      setStatus("error");
      setMessage("No pudimos verificar el enlace. Intenta de nuevo.");
    }
  }, []);

  useEffect(() => {
    if (initialToken) void verifyToken(initialToken);
  }, [initialToken, verifyToken]);

  const requestLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = email.trim();
    if (!value) return;
    setStatus("loading");
    setMessage("");
    setTickets(null);
    try {
      const res = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setPhase("sent");
        setStatus("done");
        setMessage(
          data.message ||
            "Si hay códigos asociados a ese correo, te enviamos un enlace seguro. Revisa bandeja y spam.",
        );
      } else {
        setStatus("error");
        setMessage(data.error || "No pudimos enviar el enlace. Intenta más tarde.");
      }
    } catch {
      setStatus("error");
      setMessage("No pudimos enviar el enlace. Intenta más tarde.");
    }
  };

  return {
    email,
    setEmail,
    phase,
    status,
    message,
    tickets,
    requestLink,
    verifyToken,
  };
}
