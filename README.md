# RecycleQuest – deploy guide (free, no API keys)

Everything is static files in `public/`. No server or paid service needed.

## Deploy on Vercel
1. Push this folder to a GitHub repo.
2. vercel.com > Add New > Project > import the repo. Framework Preset: "Other". (vercel.json already sets the output folder to `public`.)
3. Deploy, open the URL on your phone, then Add to Home Screen.
CLI alternative: `npm i -g vercel`, then `vercel --prod` in this folder.

## Other free hosts
Upload the `public/` folder to Netlify Drop, Cloudflare Pages or GitHub Pages (must be HTTPS for install/offline).

## What works
Missions, XP and levels, streaks, neighbourhood, avatar, recycling guide, bin map, local accounts, CSV export, offline use, installable.
The Guide tab links to NEA's official Bloobin chatbot on WhatsApp (go.gov.sg/askbloobin) and Telegram (go.gov.sg/askbloobintg).
Not available when self-hosted: teams, leaderboard, cheers, cloud save, shared bin data (they relied on Claude's database).
Progress is saved in each device's browser storage.
