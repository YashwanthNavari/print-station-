# PrintStation — Production & Vercel Deployment Specification

This specification documents the authoritative production deployment architecture for PrintStation when transitioning to GitHub and Vercel.

---

## 1. Core Architectural Principle

> **PrintStation is a 2-tier hybrid system:**
> - **Cloud Web Layer (Vercel):** Self-service customer upload portal & remote admin monitoring.
> - **Local Hardware Layer (Windows PC):** Local print station agent controlling physical Windows printers, local caching, and system print dialogs.

```text
                           INTERNET
                              │
                              ▼
                ┌───────────────────────────┐
                │          VERCEL           │
                │                           │
                │   • Customer App (Next)   │
                │   • Admin Dashboard (Vite)│
                └─────────────┬─────────────┘
                              │
                       HTTPS  │ (Cloud API / Supabase)
                              ▼
                ┌───────────────────────────┐
                │       CLOUD BACKEND       │
                │  • PostgreSQL (Supabase)  │
                │  • Storage (S3 / R2 / Blob│
                └─────────────┬─────────────┘
                              │
                    Secure Polling / SSE
                              ▼
                ┌───────────────────────────┐
                │    WINDOWS PRINT AGENT    │
                │  (apps/print-station/srv) │
                │                           │
                │  • SQLite Local Cache     │
                │  • System / Chrome Print  │
                │  • Windows Spooler / USB  │
                └─────────────┬─────────────┘
                              │
                              ▼
                       Physical Printer
```

---

## 2. The 3 Applications & Their Deployment Targets

| Application | Path | Framework | Deployment Target | Output Directory |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Portal** | `apps/customer` | Next.js 16 (React 19) | **Vercel Project 1** | `.next` (automatic) |
| **Admin Dashboard** | `apps/print-station/client` | Vite + React 19 | **Vercel Project 2** | `dist` |
| **Print Station Agent** | `apps/print-station` | Express + SQLite + Node.js | **Local Windows PC** | Persistent Node process / Windows Service |

---

## 3. Vercel Project Configurations

### Project 1: Customer Web App (`printstation-customer`)
- **Root Directory:** `apps/customer`
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Environment Variables (Production):**
  - `NEXT_PUBLIC_API_URL`: Your cloud API URL (e.g. `https://api.printstation.yourdomain.com`)
  - `NEXT_PUBLIC_DEFAULT_STATION_ID`: Default station identifier (e.g. `PS-TEST-001`)

### Project 2: Admin Dashboard (`printstation-admin`)
- **Root Directory:** `apps/print-station/client`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables (Production):**
  - `VITE_API_URL`: Your cloud API URL (e.g. `https://api.printstation.yourdomain.com`)

---

## 4. Critical Vercel Architectural Rules

### Rule 1: No Hardcoded Localhost or LAN IPs in Production
All endpoints are managed via centralized configuration layers:
- Customer: `apps/customer/src/lib/config.ts` reads `NEXT_PUBLIC_API_URL`
- Admin: `apps/print-station/client/src/apiConfig.ts` reads `VITE_API_URL`
- Never hardcode `localhost:3000` or `192.168.x.x` in production code.

### Rule 2: Never Deploy SQLite to Vercel
- Vercel Functions are stateless and serverless with a read-only filesystem (except ephemeral `/tmp`).
- `printstation.db` and SQLite WAL files must never be deployed or committed to Git.
- SQLite is reserved exclusively for the local Windows Print Agent cache.
- Cloud persistence uses PostgreSQL (see `supabase/schema.sql`).

### Rule 3: The 4.5MB Vercel Function Limit & 25MB Upload Architecture
- Vercel Functions enforce a **4.5 MB maximum request payload**.
- Sending 25 MiB PDF uploads directly through a Vercel Function will fail (`413 FUNCTION_PAYLOAD_TOO_LARGE`).
- **Production Upload Strategy:**
  1. Customer browser requests a presigned direct-upload URL from cloud storage (Supabase Storage, Cloudflare R2, AWS S3, or Vercel Blob).
  2. Customer browser uploads the PDF directly to object storage.
  3. Customer browser posts only the metadata (storage key, page settings, copies) to the API.
  4. Local Windows Print Agent downloads the PDF directly from object storage via secure token.

### Rule 4: Zero Secrets in Browser Variables
- Only non-sensitive URLs and station names are prefixed with `NEXT_PUBLIC_` or `VITE_`.
- Database credentials, service role keys, and admin tokens remain strictly server-side.

### Rule 5: Strict Git Hygiene
The root `.gitignore` excludes:
- `*.db`, `*.db-shm`, `*.db-wal`, `printstation.db`
- `uploads/`, `downloads/`, `storage/`, `tmp/`
- `.env`, `.env.local`, `.env.*.local`
- `node_modules/`, `.next/`, `dist/`, `.vite/`, `.vercel/`

### Rule 6: CORS Configuration
Backend CORS allows:
- Local development origins: `http://localhost:3000`, `http://localhost:3001`, `http://localhost:5173`, `http://192.168.x.x`
- Production origins: Configured dynamically via `ALLOWED_ORIGINS` environment variable (e.g. `https://printstation.yourdomain.com,https://admin.yourdomain.com`).

---

## 5. Pre-Push Production Readiness Checklist

Before pushing to GitHub or connecting to Vercel:

- [x] **Root `.gitignore` created** — SQLite databases, downloads, and `.env*` files excluded.
- [x] **Customer App build verified** — `npm run build` in `apps/customer` passes with 0 errors.
- [x] **Admin App build verified** — `npm run build` in `apps/print-station/client` passes with 0 errors.
- [x] **Centralized config implemented** — `NEXT_PUBLIC_API_URL` and `VITE_API_URL` supported.
- [x] **Template environment files added** — `.env.example` created in both `apps/customer` and `apps/print-station/client`.
- [x] **CORS origins upgraded** — `ALLOWED_ORIGINS` environment variable supported on backend.
- [x] **Node.js engines specified** — `"node": ">=22.0.0"` defined in package.json files.
- [ ] **Remove nested `.git` directory** — `apps/customer/.git` should be removed prior to `git init` at the monorepo root.
- [ ] **Configure Vercel Environment Variables** — Set `NEXT_PUBLIC_API_URL` and `VITE_API_URL` in Vercel project dashboards.
