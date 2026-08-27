<div align="center">

# 🍀 Suertu2s

**Plataforma Integral de E-Commerce de Arte Digital, Sorteos Oficiales y Red de Afiliados**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Protected-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)

</div>

---

## 📖 Descripción General

**Suertu2s** es una plataforma moderna de comercio electrónico construida sobre **Next.js 16** y **React 19** que permite la compra y descarga de paquetes de ilustraciones digitales coleccionables, otorgando de forma automática y transparente números de participación para sorteos oficiales certificados.

Cuenta con un motor de asignación atómica de boletos, pasarela de pagos integrada con **Flow.cl** (Webpay, Tarjetas bancarias, Servipag y Cuenta RUT), un portal de afiliados para embajadores con tracking de comisiones y generación de códigos QR, y un panel de administración en tiempo real.

---

## 🏗️ Arquitectura y Tecnologías

```
                        ┌────────────────────────┐
                        │   Usuario / Cliente    │
                        └───────────┬────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   Cloudflare Edge (CDN / WAF / SSL Full Strict)        │
       │   - Protección DDoS & Bot Management                  │
       │   - Detección de IP Real (CF-Connecting-IP)            │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   Vercel Serverless Platform                           │
       │   - Next.js 16 App Router & Turbopack                  │
       │   - Middleware Edge & API Routes Seguras               │
       └───────┬────────────────────┬────────────────────┬──────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
     │ Supabase (Postgres)│ │ Flow.cl Gateway  │ │ Resend (Email)   │
     │ - Row Level Sec. │ │ - Webpay / TC/TD │ │ - Tickets & Art  │
     │ - Emisión Boletos│ │ - Webhooks       │ │ - Transaccional  │
     └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 🚀 Stack Tecnológico

- **Frontend & Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + [React 19](https://react.dev/).
- **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/) con tipado estricto.
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/) + Micro-animaciones CSS y Smooth Scroll con Lenis.
- **Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL) con RLS (Row Level Security), índices B-Tree y procedimiento almacenado atómico `fulfill_order_and_generate_tickets`.
- **Pasarela de Pagos:** [Flow.cl](https://www.flow.cl/) (SDK y Webhooks con verificación de firma criptográfica).
- **Mailing Transaccional:** [Resend](https://resend.com/) para envío automático de comprobantes y enlaces de descarga de arte.
- **Infraestructura:** [Vercel](https://vercel.com/) (Hosting & Edge Functions) + [Cloudflare](https://www.cloudflare.com/) (DNS, CDN, WAF, SSL Full Strict).
- **Testing & Calidad:** [Vitest](https://vitest.dev/) (pruebas unitarias), [Playwright](https://playwright.dev/) (E2E), ESLint 9 y Prettier.

---

## ✨ Características Principales

### 🛒 1. Experiencia de Compra & Catálogo
- Catálogo interactivo de ilustraciones digitales organizadas por paquetes temáticos.
- Carrito de compras reactivo persistente con **Zustand**.
- Checkout optimizado en un solo paso con validación de RUT chileno, teléfono y correo electrónico.
- Soporte para códigos de descuento y referidos de afiliados (`?ref=CODIGO`).

### 🎟️ 2. Motor Atómico de Boletos
- Asignación de números aleatorios (`0..99999`) y códigos de boleto con prefijo del sorteo (ej. `S2S2648291`).
- Algoritmo con reintentos y bloqueo transaccional (`FOR UPDATE` / Supabase RPC) que garantiza **0 duplicados** bajo alta concurrencia.
- Portal público de verificación de boletos (`/check-tickets`) mediante correo electrónico.

### 👥 3. Red & Portal de Afiliados (`/afiliados`)
- Acceso seguro mediante contraseña encriptada con hash **scrypt**.
- Dashboard en tiempo real con estadísticas de ventas, clics y saldo de comisiones (porcentaje o monto fijo).
- Generador automático de enlaces personalizados y códigos QR para campañas en redes sociales.

### 🔒 4. Panel de Administración (`/admin`)
- Control integral de pedidos, estados de pago y liquidaciones a afiliados.
- Métricas en vivo (KPIs, ticket promedio, tasa de referidos, desglose por método de pago y paquetes).
- Configuración dinámica del sorteo, enlaces de streaming en vivo para el sorteo final y asignación de ticket ganador.

### 🛡️ 5. Seguridad de Grado Empresarial
- Protección CSRF para endpoints mutantes mediante validación de origen estricta.
- Rate limiter inteligente adaptado a cabeceras de proxy (`CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For`).
- Sesiones HTTP-only seguras con cookies firmadas.

---

## 📁 Estructura del Repositorio

```
.
├── docs/                                 # Documentación técnica y guías
│   └── DEPLOYMENT_SUPABASE_VERCEL_CLOUDFLARE.md
├── supabase_schema.sql                   # Esquema SQL completo para Supabase PostgreSQL
├── vercel.json                           # Configuración de despliegue y headers de seguridad
├── v2/                                   # Código fuente de la aplicación Next.js
│   ├── public/                           # Assets estáticos e ilustraciones
│   ├── src/
│   │   ├── app/                          # App Router (Páginas y API Routes)
│   │   │   ├── (public)/                 # Landing, Checkout, Carrito, Check Tickets
│   │   │   ├── admin/                    # Panel administrativo
│   │   │   ├── afiliados/                # Portal de embajadores / afiliados
│   │   │   └── api/                      # Endpoints REST (checkout, payments, admin, affiliate)
│   │   ├── components/                   # Componentes React reutilizables
│   │   ├── data/                         # Datos estáticos y configuración de packs
│   │   ├── lib/                          # Capas de lógica, base de datos y seguridad
│   │   │   ├── db/                       # Supabase, MySQL y Memory Store
│   │   │   ├── payments/                 # Integración Flow.cl y mock de pagos
│   │   │   ├── security/                 # Hashing, Rate Limiting, CSRF y Cookies
│   │   │   └── email.ts                  # Integración con Resend
│   │   └── middleware.ts                 # Protección Edge para rutas administrativas
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## ⚡ Guía de Inicio Rápido (Local)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Suertu2s/suertu2s.git
cd suertu2s/v2
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (si se deja vacío, funciona en modo memoria local automáticamente)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Flow.cl (opcional en local si usas pagos de prueba)
FLOW_API_KEY=
FLOW_SECRET_KEY=
FLOW_ENV=sandbox

# Administrador
ADMIN_EMAILS=admin@suertu2s.cl
ADMIN_PASSWORD=admin-password-local
ADMIN_SESSION_SECRET=clave-secreta-para-sesiones-locales
```

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```

Abre en tu navegador:
- 🌐 **Tienda:** [http://localhost:3000](http://localhost:3000)
- 🎫 **Consulta de Boletos:** [http://localhost:3000/check-tickets](http://localhost:3000/check-tickets)
- 🤝 **Portal de Afiliados:** [http://localhost:3000/afiliados](http://localhost:3000/afiliados)
- ⚙️ **Panel de Administración:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🗄️ Base de Datos (Supabase)

Para desplegar la base de datos en Supabase:
1. Crea un proyecto en [https://supabase.com](https://supabase.com).
2. Ve a **SQL Editor** -> **New query**.
3. Copia y ejecuta todo el contenido de [`supabase_schema.sql`](./supabase_schema.sql).
4. Copia las claves de **Project Settings** -> **API** y colócalas en tus variables de entorno.

---

## 🚀 Despliegue en Producción (Vercel + Cloudflare)

La plataforma está diseñada para desplegarse en segundos en **Vercel** con **Cloudflare** como capa de seguridad perimetral:

1. **Vercel:** Importa el repositorio en [vercel.com](https://vercel.com), configura las variables de entorno de producción y despliega.
2. **Cloudflare:** Configura el dominio apuntando el registro CNAME a `cname.vercel-dns.com` con proxy activado (nube naranja) y modo SSL/TLS **Full (strict)**.

> 📘 Consulta la guía completa paso a paso en [**DEPLOYMENT_SUPABASE_VERCEL_CLOUDFLARE.md**](./docs/DEPLOYMENT_SUPABASE_VERCEL_CLOUDFLARE.md).

---

## 🧪 Pruebas y Calidad de Código

```bash
# Validar tipado TypeScript
npm run typecheck

# Ejecutar pruebas unitarias (Vitest)
npm run test

# Ejecutar pruebas de extremo a extremo (Playwright)
npm run test:e2e

# Formatear código con Prettier
npm run format

# Validar estándares con ESLint
npm run lint

# Verificación integral de calidad
npm run quality
```

---

## 📄 Licencia y Créditos

Desarrollado con dedicación para **Suertu2s**. Todos los derechos reservados © 2026.
Para soporte técnico o consultas comerciales, contacta a [contacto@suertu2s.cl](mailto:contacto@suertu2s.cl).
