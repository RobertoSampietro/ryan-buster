import { registrationToIcao24 } from "../lib/adsbdb.js";
import {
  getAircraftFlights,
  getLiveState,
  findInboundLeg,
  getArrivalsAtAirport,
  findArrivalByIcao24,
} from "../lib/opensky.js";
import { searchByFlightIcao, normalizeFlight } from "../lib/aviationstack.js";

export default async function handler(req, res) {
  try {
    const { icao24: icao24Param, registration, depIcao, flightDeparture } =
      req.query;

    if (!depIcao) {
      res.status(400).json({ error: "Parametro 'depIcao' mancante." });
      return;
    }

    let icao24 = icao24Param ? icao24Param.toLowerCase() : null;
    if (!icao24 && registration) {
      icao24 = await registrationToIcao24(registration);
    }
    if (!icao24) {
      res.status(200).json({
        status: "no_aircraft",
        message:
          "Aereo non ancora assegnato a questo volo, o registrazione non trovata. Riprova piu' vicino alla partenza.",
      });
      return;
    }

    const beforeTs = flightDeparture
      ? Math.floor(new Date(flightDeparture).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    const depIcaoUpper = depIcao.toUpperCase();
    const legs = await getAircraftFlights(icao24, 18);
    let inbound = findInboundLeg(legs, depIcaoUpper, beforeTs);

    // Fallback: /flights/aircraft can lag behind. Cross-check the
    // airport-centric arrivals feed too, it's often fresher.
    if (!inbound || !inbound.lastSeen) {
      const arrivals = await getArrivalsAtAirport(depIcaoUpper, 18);
      const arrivalMatch = findArrivalByIcao24(arrivals, icao24, beforeTs);
      if (arrivalMatch && arrivalMatch.lastSeen) inbound = arrivalMatch;
    }

    if (inbound && inbound.lastSeen) {
      // Aircraft has already landed at our departure airport.
      let delayInfo = null;
      if (inbound.callsign) {
        try {
          const raw = await searchByFlightIcao(inbound.callsign.trim());
          if (raw.length) delayInfo = normalizeFlight(raw[0]);
        } catch {
          // AviationStack lookup failed/quota hit - not fatal, we still have OpenSky data.
        }
      }

      const minutesAgo = Math.max(
        0,
        Math.round((Date.now() / 1000 - inbound.lastSeen) / 60)
      );

      res.status(200).json({
        status: "landed",
        icao24,
        inboundCallsign: (inbound.callsign || "").trim(),
        inboundDepartureAirport: inbound.estDepartureAirport,
        inboundArrivalAirport: inbound.estArrivalAirport,
        arrivedAt: new Date(inbound.lastSeen * 1000).toISOString(),
        minutesAgo,
        aviationstack: delayInfo, // has departure/arrival delayMinutes if AviationStack had data
      });
      return;
    }

    // Not landed yet at our airport per OpenSky history - check if it's live/airborne.
    const live = await getLiveState(icao24);
    if (live && !live.onGround) {
      res.status(200).json({
        status: "en_route",
        icao24,
        live,
        message:
          "Aereo ancora in volo verso il tuo aeroporto di partenza. Nessun dato di ritardo storico ancora disponibile per questa tratta.",
      });
      return;
    }

    res.status(200).json({
      status: "unknown",
      icao24,
      message:
        "Nessun volo in arrivo trovato per questo aereo verso il tuo aeroporto nelle ultime 18 ore, e l'aereo non risulta in volo ora. Potrebbe essere gia' a terra da prima, o fuori copertura ADS-B.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
