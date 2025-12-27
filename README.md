## Cerna

Calm, fast home base for web resources: quick access, save for later, and smart search.

## Getting Started

1. Install deps:

```bash
npm install
```

2. Set environment variables (copy `env.example` → `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (optional, defaults to `http://localhost:3000`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; **required for local/dev writes** because DB RLS gates writes behind entitlements, and the app seeds an active entitlement in dev)
- `SOLIDGATE_API_PUBLIC_KEY`, `SOLIDGATE_API_SECRET_KEY`
- `SOLIDGATE_WEBHOOK_PUBLIC_KEY`, `SOLIDGATE_WEBHOOK_SECRET_KEY`
- `SOLIDGATE_PRODUCT_PRICE_ID_MONTHLY`, `SOLIDGATE_PRODUCT_PRICE_ID_YEARLY`, `SOLIDGATE_TRIAL_DAYS`

3. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

### App routes

- Marketing: `/`
- Auth: `/login`, `/signup`
- App (requires auth): `/app`

### Tech

- Next.js (App Router) + TypeScript
- Tailwind + shadcn/ui
- Supabase (Auth + Postgres)
- Solidgate (subscriptions)
