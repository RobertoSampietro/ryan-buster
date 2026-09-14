import {
  searchByFlightNumber,
  searchByRoute,
  normalizeFlight,
} from "../lib/aviationstack.js";

/**
 * Airlines publish flight numbers inconsistently (with or without a
 * leading zero, e.g. "FR76" vs "FR076"). Build a small set of likely
 * variants so a search still works even if the person typed it differently.
 */
function flightNumberVariants(input) {
  const clean = input.toUpperCase().replace(/\s+/g, "");
  const variants = new Set([clean]);

  const m = clean.match(/^([A-Z]{1,3})0*([0-9]+)$/);
  if (m) {
    const [, code, digits] = m;
    variants.add(`${code}${digits}`); // no leading zero
    variants.add(`${code}0${digits}`); // one leading zero
  }
  return [...variants];
}

export default async function handler(req, res) {
  try {
    const { flight, dep, arr } = req.query;

    let raw = [];
    if (flight) {
      for (const variant of flightNumberVariants(flight)) {
        raw = await searchByFlightNumber(variant);
        if (raw.length) break;
      }
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
