"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminContextValue = {
  email: string;
  displayName: string;
  authed: boolean;
  authReady: boolean;
  mustChangePassword: boolean;
  canManualSales: boolean;
  from: string;
  to: string;
  loading: boolean;
  error: string | null;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  setError: (v: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  adminFetch: (path: string, init?: RequestInit) => Promise<Response>;
  readJson: <T = Record<string, unknown>>(
    res: Response,
    label: string,
  ) => Promise<T>;
  refreshKey: number;
  bumpRefresh: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

function defaultFrom() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 30);
  return dt.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [canManualSales, setCanManualSales] = useState(false);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        const data = (await res.json()) as {
          authenticated?: boolean;
          email?: string;
          displayName?: string;
          mustChangePassword?: boolean;
          canManualSales?: boolean;
          configured?: boolean;
        };
        if (cancelled) return;
        if (data.authenticated && data.email) {
          setEmail(data.email);
          setDisplayName(data.displayName || data.email);
          setAuthed(true);
          setMustChangePassword(Boolean(data.mustChangePassword));
          setCanManualSales(Boolean(data.canManualSales));
        } else {
          setAuthed(false);
          setEmail("");
          setDisplayName("");
          setMustChangePassword(false);
          setCanManualSales(false);
        }
        if (res.status === 503) {
          setError(
            "Admin no configurado. Define ADMIN_EMAILS y ADMIN_PASSWORD.",
          );
        }
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (value: string, password: string) => {
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value.trim(), password }),
    });
    const data = (await res.json()) as {
      error?: string;
      email?: string;
      displayName?: string;
      mustChangePassword?: boolean;
      canManualSales?: boolean;
    };
    if (!res.ok) {
      throw new Error(data.error || "Credenciales inválidas");
    }
    setEmail(data.email || value.trim());
    setDisplayName(data.displayName || data.email || value.trim());
    setAuthed(true);
    setMustChangePassword(Boolean(data.mustChangePassword));
    setCanManualSales(Boolean(data.canManualSales));
  }, []);

  const changePassword = useCallback(
    async (password: string, passwordConfirmation: string) => {
      setError(null);
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirmation }),
      });
      const data = (await res.json()) as {
        error?: string;
        email?: string;
        displayName?: string;
        canManualSales?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "No se pudo cambiar la contraseña");
      }
      setEmail(data.email || email);
      setDisplayName(data.displayName || displayName);
      setMustChangePassword(false);
      setCanManualSales(Boolean(data.canManualSales));
    },
    [displayName, email],
  );

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
    setAuthed(false);
    setEmail("");
    setDisplayName("");
    setMustChangePassword(false);
    setCanManualSales(false);
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const adminFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      setLoading(true);
      try {
        const headers = new Headers(init?.headers);
        if (!headers.has("Content-Type") && init?.body) {
          headers.set("Content-Type", "application/json");
        }
        const sep = path.includes("?") ? "&" : "?";
        const url =
          path.includes("from=") || path.includes("to=")
            ? path
            : `${path}${sep}from=${from}&to=${to}`;
        return await fetch(url, {
          ...init,
          headers,
          credentials: "include",
        });
      } finally {
        setLoading(false);
      }
    },
    [from, to],
  );

  const readJson = useCallback(
    async <T = Record<string, unknown>,>(res: Response, label: string) => {
      const text = await res.text();
      let data: { error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { error?: string };
        } catch {
          throw new Error(`${label}: respuesta inválida (${res.status})`);
        }
      }
      if (!res.ok) {
        if (res.status === 401) {
          setAuthed(false);
        }
        throw new Error(data.error || `${label}: error ${res.status}`);
      }
      return data as T;
    },
    [],
  );

  const value = useMemo(
    () => ({
      email,
      displayName,
      authed,
      authReady,
      mustChangePassword,
      canManualSales,
      from,
      to,
      loading,
      error,
      setFrom,
      setTo,
      setError,
      login,
      changePassword,
      logout,
      adminFetch,
      readJson,
      refreshKey,
      bumpRefresh,
    }),
    [
      email,
      displayName,
      authed,
      authReady,
      mustChangePassword,
      canManualSales,
      from,
      to,
      loading,
      error,
      login,
      changePassword,
      logout,
      adminFetch,
      readJson,
      refreshKey,
      bumpRefresh,
    ],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin debe usarse dentro de AdminProvider");
  return ctx;
}
