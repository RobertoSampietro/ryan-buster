# flight-delay-tracker (Ritardo Reale)

Find out how much delay the aircraft assigned to your flight is already carrying,
by tracking the flight it operated right before yours.

## How it works

1. You search a flight (by number, or by route, results are filtered to today).
2. Backend calls **AviationStack** to get the scheduled flight and, if assigned
   (usually only a few hours before departure), the aircraft's registration.
3. Backend queries AviationStack again for all flights arriving at *your*
   departure airport, and matches by aircraft **registration** to find the
   inbound leg that aircraft just flew.
4. If that leg already landed: AviationStack gives the actual arrival time
   and delay in minutes directly, that's the delay your aircraft is carrying.
5. If the aircraft hasn't landed yet: shows it's en route, with live position
   if available.

Everything runs on a single data provider (AviationStack). No other API keys
or accounts are needed.

## Known limits

- Aircraft is usually only assigned a few hours before departure. Searching
  days ahead will show "aereo non assegnato". This matches your stated use case.
- Free tier is capped at **100 requests/month**. Each flight check uses 1-2 calls.
- AviationStack's free tier is real-time/near-term data, coverage of the
  inbound leg depends on it still being in that window.

## Project structure

api/
search.js - GET /api/search?flight=AZ204 or ?dep=VLC&arr=FCO
delay.js - GET /api/delay?registration=...&depIata=...
lib/
aviationstack.js
public/
index.html - the whole frontend, single file


## Setup

```bash
npm install -g vercel   # if you don't have it
vercel dev
```

Set your AviationStack key (free tier at aviationstack.com):

```bash
vercel env add AVIATIONSTACK_KEY
```

## Deploy

```bash
vercel --prod
```

Push this repo to GitHub first if you want auto-deploys on push (connect the
repo in the Vercel dashboard).

## Next steps / ideas

- Auto-refresh the detail view every 60s while status is "en_route"
- Airport autocomplete for the route search (currently raw IATA input)
- Push notification when the inbound delay crosses a threshold you set
