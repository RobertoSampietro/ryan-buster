const BASE = "https://opensky-network.org/api";

/**
 * Flight legs flown by an aircraft (by ICAO24) within a time window.
 * OpenSky allows max 30 days range; keep it tight (default last 18h) to stay
 * within the anonymous rate limit.
 */
export async function getAircraftFlights(icao24, hoursBack = 18) {
  const end = Math.floor(Date.now() / 1000);
  const begin = end - hoursBack * 3600;
  const url = `${BASE}/flights/aircraft?icao24=${encodeURIComponent(
    icao24
  )}&begin=${begin}&end=${end}`;
  const res = await fetch(url);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`OpenSky error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Current live state vector for an aircraft, if airborne/visible.
 */
export async function getLiveState(icao24) {
  const url = `${BASE}/states/all?icao24=${encodeURIComponent(icao24)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenSky error: ${res.status}`);
  const data = await res.json();
  const s = data?.states?.[0];
  if (!s) return null;
  return {
    icao24: s[0],
    callsign: (s[1] || "").trim(),
    originCountry: s[2],
    longitude: s[5],
    latitude: s[6],
    baroAltitudeM: s[7],
    onGround: s[8],
    velocityMs: s[9],
    trueTrack: s[10],
    verticalRateMs: s[11],
  };
}

/**
 * Among an aircraft's recent legs, find the one landing at `depIcao`
 * (i.e. the leg that puts the aircraft where our flight departs from),
 * choosing the most recent one that started before `beforeTs`.
 */
export function findInboundLeg(legs, depIcao, beforeTs) {
  const candidates = legs
    .filter((l) => l.estArrivalAirport === depIcao)
    .filter((l) => (l.firstSeen || 0) <= beforeTs)
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  return candidates[0] || null;
}
