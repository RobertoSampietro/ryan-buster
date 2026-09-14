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

    const icao24Lower = icao24.toLowerCase();
    const depIataUpper = depIata.toUpperCase();
    const nowTs = flightDeparture ? new Date(flightDeparture).getTime() : Date.now();

    // Free-tier queries aren't date-bound, so results can include flights
    // from other days entirely. Since the same aircraft (icao24) flies many
    // routes over time, an old unrelated landing can otherwise look like a
    // false match. Discard anything too far in time from our own flight.
    function withinWindow(f, hours = 30) {
      const t = f.arrival.actual || f.arrival.scheduled || f.departure.scheduled;
      if (!t) return false;
      const ts = new Date(t).getTime();
      if (isNaN(ts)) return false;
      return Math.abs(nowTs - ts) <= hours * 3600 * 1000;
    }

    // Three targeted queries instead of one broad one: the free plan caps
    // results at 100 per request, and an unfiltered query mixes in flights
    // of every status, easily pushing our aircraft's actual leg past the cap.
    async function safeQuery(status) {
      try {
        const raw = await searchByArrivalAirport(depIataUpper, status);
        return { flights: raw.map(normalizeFlight), error: null };
      } catch (e) {
        return { flights: [], error: e.message };
      }
    }

    const [landedR, activeR, scheduledR] = await Promise.all([
      safeQuery("landed"),
      safeQuery("active"),
      safeQuery("scheduled"),
    ]);

    const findByIcao24 = (flights) =>
      flights
        .filter(
          (f) => f.aircraft.icao24 && f.aircraft.icao24.toLowerCase() === icao24Lower
        )
        .filter(withinWindow);

    // Case 1: aircraft already landed at our departure airport.
    const landedCandidates = findByIcao24(landedR.flights).sort((a, b) =>
      (b.arrival.actual || b.arrival.scheduled || "").localeCompare(
        a.arrival.actual || a.arrival.scheduled || ""
      )
    );
    if (landedCandidates.length) {
      const inbound = landedCandidates[0];
      res.status(200).json({
        status: "landed",
        inboundFlight: inbound.flightIata || inbound.flightIcao,
        inboundDepartureAirport: inbound.departure.airportIata,
        arrivedAt: inbound.arrival.actual || inbound.arrival.estimated,
        arrivalDelayMinutes: inbound.arrival.delayMinutes,
      });
      return;
    }

    // Case 2: aircraft currently airborne, en route to our airport.
    const activeCandidate = findByIcao24(activeR.flights)[0];
    if (activeCandidate) {
      res.status(200).json({
        status: "en_route",
        inboundFlight: activeCandidate.flightIata || activeCandidate.flightIcao,
        inboundDepartureAirport: activeCandidate.departure.airportIata,
        departureDelayMinutes: activeCandidate.departure.delayMinutes,
        live: activeCandidate.live,
      });
      return;
    }

    // Case 3: aircraft hasn't left its previous airport yet.
    const scheduledCandidate = findByIcao24(scheduledR.flights)[0];
    if (scheduledCandidate) {
      res.status(200).json({
        status: "not_departed",
        inboundFlight: scheduledCandidate.flightIata || scheduledCandidate.flightIcao,
        inboundDepartureAirport: scheduledCandidate.departure.airportIata,
        inboundScheduledDeparture: scheduledCandidate.departure.scheduled,
        departureDelayMinutes: scheduledCandidate.departure.delayMinutes,
      });
      return;
    }

    res.status(200).json({
      status: "unknown",
      message:
        "Nessun volo trovato per questo aereo in arrivo al tuo aeroporto. L'informazione potrebbe non essere ancora disponibile.",
      debug: {
        depIataUpper,
        icao24: icao24Lower,
        landedFlightsChecked: landedR.flights.length,
        activeFlightsChecked: activeR.flights.length,
        scheduledFlightsChecked: scheduledR.flights.length,
        fetchError: landedR.error || activeR.error || scheduledR.error,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
