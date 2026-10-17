# TIJARAH – structure & fixes

## Folder layout
```
index.html          page markup only
css/print.css       80mm thermal receipt print rules
js/config.js        Apps Script URL, registration code, sizes, categories
js/utils.js         escapeHtml, safeJsonParse, Dhaka date/time helpers
js/storage.js       in-memory data store, Google Sheets sync, localStorage cache
js/auth.js          login / sign-up / logout, history, profiles, admin, Kchaao reset
js/inventory.js     inventory tab
js/pos.js           scanner, cart, discounts, checkout, receipt
js/invoices.js      invoices tab
js/customers.js     customer leaderboard
js/reports.js       rollover, analytics, charts, daily/monthly reports, history, print
js/app.js           menu, tab switching, start-up
```
Scripts are plain (non-module) files loaded in order, so open `index.html` directly – no build step.

## Bugs fixed
1. Sales were stored under the UTC date, so sales between 12am–6am Dhaka time landed on the previous day / month. Now uses Dhaka date everywhere.
2. Month rollover deleted sales days if an archive for that month already existed. Now merges.
3. Yearly archive only ran if the app was opened on Dec 31 (and missed December). Now archives every finished year.
4. Re-printing an old invoice and closing it wiped the sale in progress (cart + customer). Fixed.
5. Receipt line printed "BDT 2 × 2450.00" (qty/price swapped). Fixed.
6. Login-history timestamps broke on Safari (history vanished / "Invalid Date"). Fixed.
7. "Tab closed" logout was recorded 2–3 times and with the wrong time. Now once, with the real close time.
8. Duplicate function definitions (active-user, history, time) – old localStorage versions silently overridden. Removed.
9. Names/barcodes/colors with quotes or HTML broke buttons and allowed script injection (XSS). All output escaped; buttons use data attributes.
10. Corrupted localStorage crashed the whole app. Now falls back safely.
11. Discount over 100% / negative return amount produced wrong totals. Clamped.
12. Custom discount value stayed after choosing a preset discount. Reset.
13. POS colour list showed colours with zero stock. Filtered.
14. Stock tab crashed if Chart.js could not load. Guarded.
15. Report printing could print unstyled / popup blocked. Waits for load, hides buttons, warns if blocked.
16. Receipt showed "Customer: Ali ()" when only a name was given. Fixed.
17. Negative product price was accepted. Rejected.
Also: Tailwind and Chart.js pinned to exact versions, menu button got aria-label, dead `clearHistoryLogs` removed.

## Still needs attention (cannot be fixed inside a front-end-only page)
- Passwords are stored in plain text, and the admin password + registration code are readable in `js/config.js` / `js/storage.js`. Anyone who opens the site can see them. Real protection needs login checked by a server (e.g. in Apps Script).
- Cloud saves are "last write wins": two cashiers on two computers can overwrite each other, and if the cloud is unreachable at load, stale local data can later overwrite it.
- `cdn.tailwindcss.com` is a development CDN and needs internet; for a shop POS, build a local Tailwind CSS file.
- The admin (DESK-CP-01) can rename or delete its own ID, which removes all admin rights. Left as-is because the page text says this is intended.
