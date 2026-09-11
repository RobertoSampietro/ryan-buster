import {
  searchByFlightNumber,
  searchByRoute,
  normalizeFlight,
} from "../lib/aviationstack.js";

export default async function handler(req, res) {
  try {
    const { flight, dep, arr } = req.query;

    let raw = [];
    if (flight) {
      raw = await searchByFlightNumber(flight.toUpperCase());
    } else if (dep && arr) {
      raw = await searchByRoute(dep.toUpperCase(), arr.toUpperCase());
    } else {
      res.status(400).json({
        error: "Fornisci 'flight' oppure sia 'dep' che 'arr'.",
      });
      return;
    }

    const flights = raw.map(normalizeFlight);
    res.status(200).json({ flights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
