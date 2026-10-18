# RecycleQuest – deploy guide (Vercel + Supabase, free tiers)

## 1. Create the Supabase project (5 min)
1. supabase.com > New project (free). Wait for it to finish setting up.
2. Authentication > Sign In / Providers > turn ON **Anonymous sign-ins**.
3. SQL Editor > New query > paste all of `supabase/schema.sql` > Run.
4. Project Settings > API: copy the **Project URL** and the **anon public** key.
5. Paste them into `public/config.js`.

## 2. Deploy on Vercel
1. Push this folder to a GitHub repo.
2. vercel.com > Add New > Project > import it. Framework Preset: "Other". Deploy.
3. Open the URL on your phone > Add to Home Screen.
(CLI alternative: `npm i -g vercel`, then `vercel --prod`.)

## How it works
- Each device signs in anonymously to Supabase, giving it a private user id.
- App data is stored in one table (`docs`). Row-level rules let players read the leaderboard and teams, but only write their own rows. Accounts and saves are private to the owner.
- If `config.js` is empty or Supabase is unreachable, the app runs in solo mode (everything except teams/leaderboard).

## Things to know
- Accounts are tied to the device/browser (anonymous sign-in). Clearing site data or switching phones starts a fresh identity. Cross-device login would need Supabase email/password auth (a larger change).
- Players can't edit each other's data, but XP is calculated in the browser, so a determined player could cheat their own XP on the leaderboard. Fine for friends/classes; use server-side checks if you need a competitive board.
- The leaderboard loads every player row. Fine for hundreds; add paging if you reach thousands.
- Updates arrive live via Supabase Realtime, with a 20-second refresh as a fallback.
- The shared bin-data upload button is Claude-only and is disabled here; the app uses its built-in bin data.
