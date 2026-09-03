# Finishline Trading — Telegram WebApp

## Features
- Home, How it works, Fund I & Fund II plans (content aligned with video)
- Investor signup / login (access limited to applying for investments + personal dashboard)
- Minimum investment **$2,000**
- Agreement checkbox on application
- Dashboard: applications, realized profit splits (investor baseline / excess, manager share)
- Manager percentage payment status stays **Awaiting approval** until Finishline marks **Paid**
- Admin panel (email: finishlinetrading@protonmail.com / password: admin123) to:
  - Approve / reject applications
  - Record realized profit (auto-creates manager payment in awaiting state)
  - Approve manager payments as Paid

## Local demo
Open `index.html` in a browser, or serve the folder:

```bash
cd finishline_webapp
python3 -m http.server 8080
```

## Telegram Mini App setup
1. Create a bot with @BotFather → `/newbot`
2. `/newapp` → link this WebApp URL (host the folder on HTTPS, e.g. Netlify, Vercel, Cloudflare Pages, or your VPS)
3. Set menu button / Web App URL to your hosted `index.html`

## Production notes
- Current storage is **browser localStorage** (demo). For production, connect a backend + database and validate Telegram `initData`.
- Change the default admin password immediately.
- Wire real Deriv/MT5 IDs and payment rails as needed.

## Contacts
- WhatsApp: +234 806 911 1155 | +234 806 423 6669
- Email: finishlinetrading@protonmail.com
