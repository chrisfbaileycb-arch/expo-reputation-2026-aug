# Expo Proxy Hub

AI-powered reputation management for SMBs, senior care, and multi-location brands. Companion project to [expo-proxy](https://github.com/chrisfbaileycb-arch/expo-proxy).

## Stack

- **Frontend / SSR**: React 19, TanStack Start + Router, Tailwind CSS 4, shadcn/ui (Radix), Vite
- **Backend**: Supabase (Postgres, Auth, RLS) — migrations in `supabase/migrations/`
- **AI**: Google Gemini (`gemini-3-flash-preview`) via the Gemini API's OpenAI-compatible endpoint, for review policy scanning and reply drafting
- **Integrations**: SerpApi (Yelp review polling), Google Business Profile OAuth, Stripe webhooks

## Development

You need Node.js 22+ and npm.

```sh
npm install
npm run dev
```

Other scripts: `npm run build` (production build), `npm run lint`, `npm run format`.

## Environment variables

| Variable | Used for |
| --- | --- |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Supabase project URL (client / server) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (client / server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (cron routes) |
| `GEMINI_API_KEY` | Google AI Studio API key for policy scanning + reply drafts |
| `SERPAPI_API_KEY` | Yelp review polling via SerpApi |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google Business Profile connection |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe (test-mode readiness tooling) |

Google sign-in on `/auth` uses Supabase Auth's Google OAuth provider — enable it in your Supabase dashboard (Authentication → Providers → Google).

## Cron routes

`src/routes/api/public/cron/*` (Yelp polling, outreach ticks, draft posting) are meant to be called on a schedule (e.g. `pg_cron` + `pg_net`, or any external scheduler). They authenticate with an `apikey` header matching `SUPABASE_PUBLISHABLE_KEY`.
