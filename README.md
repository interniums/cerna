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
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, required for Stripe webhooks)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`

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
- Stripe (subscriptions)
