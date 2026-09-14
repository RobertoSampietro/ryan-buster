import {
  searchByArrivalAirport,
  normalizeFlight,
} from "../lib/aviationstack.js";

export default async function handler(req, res) {
  try {
    const { icao24, depIata, flightDeparture } = req.query;

    if (!depIata) {
      res.status(400).json({ error: "Parametro 'depIata' mancante." });
      return;
    }

    if (!icao24) {
      res.status(200).json({
        status: "no_aircraft",
        message:
          "Aereo non ancora assegnato a questo volo. Riprova piu' vicino alla partenza.",
      });
      return;
    }

    let raw = [];
    let fetchError = null;
    try {
      raw = await searchByArrivalAirport(depIata.toUpperCase());
    } catch (e) {
      fetchError = e.message;
    }

    const flights = raw.map(normalizeFlight);
    const icao24Lower = icao24.toLowerCase();
    const candidates = flights.filter(
      (f) => f.aircraft.icao24 && f.aircraft.icao24.toLowerCase() === icao24Lower
    );

    // Prefer a completed (landed) leg, most recent first.
    const landed = candidates
      .filter((f) => f.status === "landed" || f.arrival.actual)
      .sort((a, b) =>
        (b.arrival.actual || b.arrival.scheduled || "").localeCompare(
          a.arrival.actual || a.arrival.scheduled || ""
        )
      );

    if (landed.length) {
      const inbound = landed[0];
      res.status(200).json({
        status: "landed",
        inboundFlight: inbound.flightIata || inbound.flightIcao,
        inboundDepartureAirport: inbound.departure.airportIata,
        arrivedAt: inbound.arrival.actual || inbound.arrival.estimated,
        arrivalDelayMinutes: inbound.arrival.delayMinutes,
      });
      return;
    }

    // Otherwise, is our aircraft currently en route (active) toward us?
    const active = candidates.find(
      (f) => f.status === "active" || f.status === "en-route"
    );
    if (active) {
      res.status(200).json({
        status: "en_route",
        inboundFlight: active.flightIata || active.flightIcao,
        inboundDepartureAirport: active.departure.airportIata,
        departureDelayMinutes: active.departure.delayMinutes,
        live: active.live,
        message: "Aereo ancora in volo verso il tuo aeroporto di partenza.",
      });
      return;
    }

    res.status(200).json({
      status: "unknown",
      message:
        "Nessun volo trovato per questo aereo in arrivo al tuo aeroporto. Potrebbe essere gia' a terra da prima (fuori dalla finestra dati), o l'informazione non e' ancora disponibile.",
      debug: {
        depIataUpper: depIata.toUpperCase(),
        icao24: icao24Lower,
        totalFlightsAtAirport: flights.length,
        candidatesFound: candidates.length,
        fetchError,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
