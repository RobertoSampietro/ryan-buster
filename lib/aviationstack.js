const BASE = "https://api.aviationstack.com/v1";
const KEY = process.env.AVIATIONSTACK_KEY;

function assertKey() {
  if (!KEY) {
    throw new Error(
      "AVIATIONSTACK_KEY non impostata sul server. Aggiungila nelle env vars."
    );
  }
}

/**
 * Search flights by IATA flight number (e.g. "AZ204").
 */
export async function searchByFlightNumber(flightIata) {
  assertKey();
  const url = `${BASE}/flights?access_key=${KEY}&flight_iata=${encodeURIComponent(
    flightIata
  )}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "AviationStack error");
  return json.data || [];
}

/**
 * Search flights by departure/arrival IATA airport codes.
 * AviationStack's free tier returns today's flights for the route.
 */
export async function searchByRoute(depIata, arrIata) {
  assertKey();
  const url = `${BASE}/flights?access_key=${KEY}&dep_iata=${encodeURIComponent(
    depIata
  )}&arr_iata=${encodeURIComponent(arrIata)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "AviationStack error");
  return json.data || [];
}

/**
 * Look up a specific flight by its ICAO callsign (e.g. "DLH441").
 * Used to find schedule/delay info for the INBOUND leg an aircraft just flew.
 */
export async function searchByFlightIcao(flightIcao) {
  assertKey();
  const url = `${BASE}/flights?access_key=${KEY}&flight_icao=${encodeURIComponent(
    flightIcao
  )}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "AviationStack error");
  return json.data || [];
}

/**
 * All flights (any status) arriving at a given IATA airport. Used to find
 * the leg our aircraft flew immediately before ours, by matching on
 * registration - avoids needing any aircraft-tracking provider at all.
 */
export async function searchByArrivalAirport(arrIata) {
  assertKey();
  const url = `${BASE}/flights?access_key=${KEY}&arr_iata=${encodeURIComponent(
    arrIata
  )}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "AviationStack error");
  return json.data || [];
}

/**
 * Normalize a raw AviationStack flight object into what the frontend needs.
 */
export function normalizeFlight(f) {
  return {
    flightIata: f.flight?.iata || null,
    flightIcao: f.flight?.icao || null,
    airline: f.airline?.name || null,
    status: f.flight_status || null,
    departure: {
      airportIata: f.departure?.iata || null,
      airportIcao: f.departure?.icao || null,
      scheduled: f.departure?.scheduled || null,
      estimated: f.departure?.estimated || null,
      actual: f.departure?.actual || null,
      delayMinutes: f.departure?.delay ?? null,
    },
    arrival: {
      airportIata: f.arrival?.iata || null,
      airportIcao: f.arrival?.icao || null,
      scheduled: f.arrival?.scheduled || null,
      estimated: f.arrival?.estimated || null,
      actual: f.arrival?.actual || null,
      delayMinutes: f.arrival?.delay ?? null,
    },
    aircraft: {
      registration: f.aircraft?.registration || null,
      icao24: f.aircraft?.icao24 || f.live?.icao24 || null,
    },
    live: f.live
      ? {
          latitude: f.live.latitude ?? null,
          longitude: f.live.longitude ?? null,
          altitude: f.live.altitude ?? null,
          speedHorizontal: f.live.speed_horizontal ?? null,
          isGround: f.live.is_ground ?? null,
          updated: f.live.updated ?? null,
        }
      : null,
  };
}
