

## Plan: Ban User by Username + Real-time Auto-Kick + Cloudflare Turnstile + Security Hardening

### Overview
Three features in one: (1) admin can ban users directly by chat username, (2) banned users get kicked instantly via real-time, (3) Cloudflare Turnstile protects auth/chat from bots and abuse.

---

### 1. Ban User by Chat Username

**AdminMonitor.tsx** — Add `handleBanByUsername(username: string)`:
- Query `profiles` table for matching username → get `user_id`
- Upsert into `user_bans` with `is_active: true`, reason: "Diblokir dari live chat oleh admin"
- Block all active tokens for that user: `tokens.update({ status: 'blocked' }).eq('user_id', userId)`
- Toast confirmation

**LiveChat.tsx** — Add `onBanUser` prop:
- New prop: `onBanUser?: (username: string) => void`
- Add ban button (UserX icon) in `ChatMessageItem` for admin only, next to existing mod buttons
- Include confirmation AlertDialog before executing ban

**AdminMonitor.tsx** — Wire `handleBanByUsername` → `onBanUser` prop on `LiveChat`

### 2. Real-time Auto-Kick for Banned Users

**Database migration**: Enable realtime on `user_bans`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bans;
```

**useAuth.ts** — Add realtime subscription on `user_bans`:
- When `user` is set, subscribe to `user_bans` table filtered by `user_id`
- On INSERT or UPDATE with `is_active = true`, immediately set `isBanned = true` and `banReason`
- This triggers BannedScreen globally across all pages (already wired via existing `isBanned` checks)
- Cleanup subscription on unmount or user change

### 3. Cloudflare Turnstile Integration

**Install**: Add `@marsidev/react-turnstile` package

**Site key**: Store Turnstile site key in codebase (it's a public key). Store secret key as edge function secret via `add_secret`.

**ViewerAuth.tsx** — Add Turnstile widget:
- Render `<Turnstile>` component on login/signup form
- Capture token on success, require it before form submission
- Pass token to a new edge function for server-side verification

**LiveChat.tsx** — Add Turnstile for first message:
- Show Turnstile challenge before user can send their first message in a session
- Store verification state in component state so it only shows once per session

**Edge function `verify-turnstile/index.ts`**:
- Accepts `{ token }`, validates against `https://challenges.cloudflare.com/turnstile/v0/siteverify` using secret key
- Returns `{ success: true/false }`

**ViewerAuth.tsx** — Call verify-turnstile before auth submission; block if failed.

### 4. Security Hardening for Live Chat & Embeds

**Chat rate limiting tightened** in LiveChat.tsx:
- Reduce message cooldown from 2s to 3s
- Add max messages per minute check (15 msgs/min client-side)
- Truncate messages to 200 chars (currently 500 in RLS, tighten client-side)

**Database migration** — Tighten chat RLS:
- Update INSERT policy to limit message length to 200 chars
- Add rate limit check via RPC in chat insert policy (optional, complex)

### Files to modify
- `supabase/migrations/` — realtime on `user_bans`, tighten chat RLS
- `src/components/admin/AdminMonitor.tsx` — ban by username handler
- `src/components/viewer/LiveChat.tsx` — ban button + Turnstile gate + tighter rate limit
- `src/hooks/useAuth.ts` — realtime `user_bans` subscription
- `src/pages/ViewerAuth.tsx` — Turnstile widget on auth form
- `supabase/functions/verify-turnstile/index.ts` — new edge function
- `package.json` — add `@marsidev/react-turnstile`

### User action required
- Create a Cloudflare Turnstile site at https://dash.cloudflare.com → Turnstile
- Provide the **Site Key** (public, will be in code) and **Secret Key** (will be stored as edge function secret)

