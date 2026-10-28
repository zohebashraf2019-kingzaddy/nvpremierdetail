# Premier Auto Detailing — website redesign (demo)

Static multi-page site for Premier Auto Detailing (Reno / Lake Tahoe mobile detailing and 9H ceramic coating). Deploys to Vercel with no build step.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Hero, coating benefits, mobile service, price overview, filterable work gallery with lightbox, video reels, process, service area |
| Services & pricing | `services.html` | Full price list with a Sedan / Medium / Large toggle, cancellation policy |
| Ceramic coating | `ceramic-coating.html` | Benefits, 1 / 3+ / 6 year options, prep process, myths |
| Book | `book.html` | Booking portal: vehicle, service, options, location → live starting price → hands off to the Square booking calendar |
| Contact | `contact.html` | Quote request form → `/api/contact` (emails the business) |
| 3D Studio | `studio.html` | Scroll-driven 3D car through every detailing stage (paint color picker) + photo upload preview (detail / correction / ceramic, before-after slider, water beading, save image) |

## Editing prices

All services and prices live in **`assets/js/pricing.js`**. The booking portal reads it live. The Services page markup was generated from it, so after changing a price also update the matching numbers in `services.html` (search for the service name).

## Square

`PREMIER.squareUrl` in `assets/js/pricing.js` is the client's Square Appointments booking link. The portal opens it in a new tab after the visitor accepts the cancellation policy. A deeper integration (embedding Square's booking widget, or creating bookings through the Square Bookings API with a serverless function) needs the client's Square account access.

## Contact form email (Vercel)

Set in Vercel → Project → Settings → Environment Variables:

- `SMTP_USER` — Gmail address that sends the email
- `SMTP_PASS` — a Gmail **app password** for that address
- `TO_EMAIL` — where quote requests should arrive (defaults to `SMTP_USER`)

Without these, `/api/contact` runs in demo mode: it accepts the form and logs the request.

## Local preview

```bash
npx serve .
```

## Credits

- 3D: [three.js](https://threejs.org) r169 (MIT), vendored in `assets/vendor/three`. The car model is built in code — no third-party 3D assets.
- Fonts: Saira Extra Condensed and Instrument Sans (SIL Open Font License), self-hosted in `assets/fonts`.
- Photos and videos: Premier Auto Detailing.
