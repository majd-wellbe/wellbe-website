# Wellbe Health Center website

Public website for wellbehealthcenter.com. Plain HTML, CSS and JS on GitHub Pages. No build step on the server.

## Pages
Home · Services · Semi private · App · FAQ · Contact · Free trial (live booking) · 404

## Free trial booking
`free-trial/` uses the same backend and rules as the ad landing page (repo `Wellbe-center-landingpage-womenAMsessions`, Apps Script "Wellbe W40 Backend", tab `LEADS W40`): weekday mornings 7 to 10 AM with Joe, next 7 days, 12 h notice, max 3 per hour. Bookings land as `Pending` and Romy confirms. The Source column starts with `website` so Romy can tell them apart from ad leads.

## Editing
All text, contact details, prices and services live in `tools/build.py`. Change it, run `python3 tools/build.py`, commit.
- WhatsApp number, Maps place, app links: top of `tools/build.py`.
- 1:3 prices: `PRICES_13`. Other prices are not on the site (they are in the app).
- Styles: `assets/site.css` (same tokens as the landing page and the app). Booking styles: `assets/booking.css`.
- After changing a CSS or JS file, bump `?v=1` in `tools/build.py` so phones reload it.

## Tracking
Meta Pixel 1458018466274647 (same as the landing page): PageView on every page; `Lead` and `Schedule` on the free trial page with content_name `website`; custom `WebsiteTrialClick` and `WebsiteWhatsApp` for button clicks.

## Domain
GitHub Pages serves this repo. To use wellbehealthcenter.com: add a `CNAME` file containing `wellbehealthcenter.com`, set the custom domain in Settings > Pages, then in GoDaddy DNS point the apex A records to 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 and `www` CNAME to `majd-wellbe.github.io`. Turn on Enforce HTTPS once the certificate is issued.
