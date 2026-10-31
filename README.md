# PaperForge

A minimalist exam-paper generator SaaS for schools. Build a curriculum-mapped question
bank, generate multi-set papers (Set A / Set B) from a blueprint, and print A4 papers with
an automatic answer key.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres +
Auth + RLS) · Cloudflare Workers via `@opennextjs/cloudflare`.

---

## Feature map

| Area | What ships |
| --- | --- |
| Auth | Email/password sign-in with `@supabase/ssr` cookie sessions, refreshed in `src/proxy.ts` |
| Roles | `super_admin`, `admin`, `teacher` — enforced by Postgres RLS, mirrored in the UI |
| Question bank | Cascading class → subject → chapter → topic, manual entry, Markdown + LaTeX (KaTeX), Urdu RTL toggle, MCQ/short/long, difficulty, marks, archive |
| Paper builder | Scope picker, per-section counts/marks/difficulty, live pool availability, 1–4 variants, option shuffling, deterministic seed |
| Print | A4 layout, institution header, instructions, marks gutter, dotted answer space, answer key on its own page |
| Institution | Name, tagline, address, logo URL, exam session, footer note |
| Staff | Super-admin provisioning, role changes, activation, deletion (service-role, server only) |

---

## 1. Prerequisites

- Node.js ≥ 20.9
- A Supabase project (free tier is fine)
- A Cloudflare account with Workers enabled (for deployment)

## 2. Install

```bash
npm install
```

## 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in, from **Supabase → Project Settings → API**:

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** — staff provisioning |

For the Workers runtime (`npm run preview` / `deploy`), copy the same values into
`.dev.vars` (local) and `wrangler secret put …` (production).

## 4. Apply the database schema

Run the migrations in order, either in the Supabase SQL editor or with the CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Files:

1. `supabase/migrations/0001_schema.sql` — enums, tables, indexes, triggers
2. `supabase/migrations/0002_rls.sql` — helper functions and row level security
3. `supabase/migrations/0003_seed.sql` — demo catalogue and questions (idempotent)

### Bootstrap the first super admin

1. Create an auth user (Supabase Dashboard → **Authentication → Users → Add user**), or
   sign in once after creating it through the Admin API.
2. Promote them:

```sql
update public.users
set role = 'super_admin'
where email = 'you@example.com';
```

Every later account is created from **Staff** in the app and defaults to the role you pick.

## 5. Run

```bash
npm run dev        # http://localhost:3000
npm test           # generator unit tests
npm run typecheck
```

If Supabase is not configured the app still boots and the login screen explains what is
missing.

---

## Cloudflare deployment

The app runs on **Cloudflare Workers** through OpenNext (Next.js SSR is not supported by
Pages). Configuration lives in `wrangler.jsonc` and `open-next.config.ts`.

```bash
npx wrangler login

# Build-time public values (also set these in Workers Builds if you use CI)
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

npm run preview    # build + run in the Workers runtime locally
npm run deploy     # build + deploy to Cloudflare
```

Notes:

- `NEXT_PUBLIC_*` values are inlined at build time. They must be present during
  `opennextjs-cloudflare build`, not only at runtime.
- `nodejs_compat` and `compatibility_date >= 2024-09-23` are required by the adapter.
- `images.unoptimized` is enabled so no Cloudflare Images binding is needed.
- If you later enable ISR/`revalidate`, add the R2 incremental cache in
  `open-next.config.ts` and bind a bucket named `NEXT_INC_CACHE_R2_BUCKET`.

---

## Architecture

```
src/
├─ proxy.ts                  session refresh + route gate (Next 16's middleware)
├─ app/
│  ├─ (auth)/login          sign-in
│  ├─ (dashboard)/          authenticated shell + pages
│  ├─ papers/[id]/print     full-bleed print route (no dashboard chrome)
│  └─ auth/{callback,signout}
├─ actions/                  server actions (validation → service → revalidate)
├─ components/               ui primitives, questions, papers, print
├─ lib/
│  ├─ auth/                  session + role guards
│  ├─ papers/                deterministic generator, PRNG, answer key
│  ├─ supabase/              browser, server, service-role, proxy clients
│  └─ validation/            Zod schemas shared by client and server
├─ services/                 data access (catalog, questions, papers, users…)
└─ types/                    hand-written Database types + domain models
```

### Security model

- Every request reads through the **anon key + the user's JWT**. RLS decides what is
  visible; hiding a nav item is cosmetic.
- `public.auth_role()` is `SECURITY DEFINER` so policies do not recurse.
- Teachers may edit only their own questions; admins manage the bank and catalogue;
  super admins additionally manage accounts.
- A trigger blocks role/status changes unless the caller is a super admin (service-role
  calls bypass it for provisioning).
- The service-role key is imported only in `src/lib/supabase/admin.ts`, which is marked
  `server-only` and used solely by the staff actions.

### Paper generation

`src/lib/papers/generator.ts` is pure and unit-tested:

1. Filter the pool by selected topics and `is_active`.
2. Per section, prefer the requested difficulty, then fall back.
3. Draw `count × sets` questions so variants are disjoint.
4. Deal round-robin into sets; if the pool is short, share questions and return warnings
   rather than silently padding.
5. Record a seeded PRNG (`mulberry32`) so a paper is reproducible.
6. Store per-set MCQ `option_order`; the answer key re-labels options A/B/C… using the same
   helper, so shuffled options never desynchronise.

### Printing

`/papers/[id]/print?set=A` renders two `.paper-sheet` blocks — the paper and the answer
key — with `@page { size: A4 }`, `break-inside: avoid` on questions and
`break-before: page` on the key. "Print / Save as PDF" uses the browser, which gives
correct Urdu shaping and KaTeX rendering for free.

Fonts (Inter, Noto Nastaliq Urdu) are loaded from Google Fonts. For offline printing and a
smaller Worker bundle, self-host subsetted `.woff2` files and swap the `<link>` in
`src/app/layout.tsx`.

---

## Data model

| Table | Purpose |
| --- | --- |
| `users` | Mirrors `auth.users`, owns `role` and `is_active` |
| `subjects` | `(class_name, subject_name)` unique |
| `topics` | Chapter → topic → sub-topic rows |
| `questions` | Type, text, JSONB options, answer, medium, difficulty, marks, direction |
| `papers` | Exam metadata, total marks, seed, owner |
| `paper_sets` | Variants of a paper (`A`, `B`, …) with their own seed |
| `paper_questions` | Ordered questions per set, marks override, option order |
| `institution_settings` | Singleton print header |

`paper_sets` is the addition that makes multi-set variants possible: a question belongs to
a *set*, not directly to a paper.

---

## Roles at a glance

| Capability | Teacher | Admin | Super admin |
| --- | :---: | :---: | :---: |
| Read active question bank | ✅ | ✅ | ✅ |
| Create questions | ✅ | ✅ | ✅ |
| Edit/archive own questions | ✅ | ✅ | ✅ |
| Edit/archive any question | — | ✅ | ✅ |
| Manage subjects/chapters | — | ✅ | ✅ |
| Edit institution profile | — | ✅ | ✅ |
| Generate papers | ✅ | ✅ | ✅ |
| See all papers | — | ✅ | ✅ |
| Manage staff accounts | — | — | ✅ |

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Next.js production build |
| `npm run preview` | Build + run in the Cloudflare Workers runtime |
| `npm run deploy` | Build + deploy |
| `npm run cf-typegen` | Generate `CloudflareEnv` types |
| `npm test` | Vitest (paper generator) |
| `npm run db:types` | Regenerate Supabase types into `src/types/database.generated.ts` |

## Known constraints & next steps

- **`initOpenNextCloudflareForDev()` is deliberately not called.** This app uses no
  Cloudflare bindings, and the helper boots Miniflare/workerd from `next.config.ts`,
  which crashes `next build` and `next dev` on some Windows hosts (`access violation
  in the runtime`, stack overflow). Wire it up only when you add a binding — the
  commented snippet in `next.config.ts` shows how.
- **`dynamic = "force-dynamic"` on `app/(dashboard)/layout.tsx` and the print route.**
  Without it Next prunes those renders at build time (no Supabase env vars during
  build ⇒ `getSessionContext()` short-circuits before touching cookies) and bakes a
  "redirect to /login" response into the static output. Keep it.
- **Bundle size:** KaTeX CSS + fonts are the largest assets. If the Worker approaches the
  size limit, subset the fonts and move the print view to client rendering.
- **Atomic inserts:** PostgREST has no multi-statement transaction. `createPaper` performs
  a compensating delete on failure; a Postgres RPC would make it strictly atomic.
- **PDF:** print-to-PDF is the default. A one-click server PDF needs Cloudflare Browser
  Rendering (paid entitlement) — the print route is already shaped for it.
- **Password reset:** accounts are admin-issued; add a "set password" flow if you want
  self-service resets.
- **List endpoints** cap at 200 questions / 100 papers. Add cursor pagination before
  scaling to a very large bank.
