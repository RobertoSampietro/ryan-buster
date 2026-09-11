const BASE = "https://api.adsbdb.com/v0";

/**
 * Given a tail registration (e.g. "D-AIBL"), resolve its ICAO24 hex ("modeS" code).
 * Free, no API key required.
 */
export async function registrationToIcao24(registration) {
  const url = `${BASE}/aircraft/${encodeURIComponent(registration)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const modeS = json?.response?.aircraft?.mode_s;
  return modeS ? modeS.toLowerCase() : null;
}
