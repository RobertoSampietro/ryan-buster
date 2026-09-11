# flight-delay-tracker (Ritardo Reale)

Find out how much delay the aircraft assigned to your flight is already carrying,
by tracking the flight it operated right before yours.

## How it works

1. You search a flight (by number, or by route + it shows today's options).
2. Backend calls **AviationStack** to get the scheduled flight and, if assigned
   (usually only a few hours before departure), the aircraft's registration/ICAO24.
3. Backend resolves registration -> ICAO24 via **adsbdb.com** (free, no key) if needed.
4. Backend queries **OpenSky Network** `flights/aircraft` for that ICAO24's last
   ~18h of activity, looking for the leg that landed at *your* departure airport.
5. If that inbound leg already landed: cross-references it against AviationStack
   (by ICAO callsign) to pull its arrival delay in minutes.
6. If the aircraft hasn't landed yet: falls back to OpenSky's live state vector
   (`states/all`) to show it's still en route (altitude, speed, callsign).

## Known limits

- Aircraft is usually only assigned a few hours before departure. Searching
  days ahead will show "aereo non assegnato". This matches your stated use case.
- Anonymous OpenSky calls are rate-limited (~400/day). Fine for personal use,
  not for heavy traffic.
- AviationStack free tier is real-time/current-day only, HTTP-only (that's why
  the key lives server-side, never call it from the browser).
- Delay minutes for the inbound leg depend on AviationStack having that route
  indexed. When it doesn't, you still get the OpenSky landing time.

## Project structure

```
api/
  search.js   - GET /api/search?flight=AZ204  or  ?dep=VLC&arr=FCO
  delay.js    - GET /api/delay?icao24=...&depIcao=...&flightDeparture=...
lib/
  aviationstack.js
  opensky.js
  adsbdb.js
public/
  index.html  - the whole frontend, single file
```

## Setup

```bash
npm install -g vercel   # if you don't have it
vercel dev
```

Set your AviationStack key (free tier at aviationstack.com):

```bash
vercel env add AVIATIONSTACK_KEY
```

or for local dev, create `.env` (already gitignored):

```
AVIATIONSTACK_KEY=your_key_here
```

## Deploy

```bash
vercel --prod
```

Push this repo to GitHub first if you want auto-deploys on push (connect the
repo in the Vercel dashboard).

## Next steps / ideas

- Cache OpenSky responses for a few minutes to stay under rate limits
- Auto-refresh the detail view every 60s while status is "en_route"
- Airport autocomplete for the route search (currently raw IATA input)
- Push notification when the inbound delay crosses a threshold you set
