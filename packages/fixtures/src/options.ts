/**
 * Option lists at three sizes.
 *
 * The sizes are chosen to separate three different failure modes:
 *   8    fits in a dropdown without scrolling; the baseline
 *   40   forces scrolling and exposes keyboard paging behaviour
 *   400  exposes whether the library virtualises, and how search performs
 *
 * Labels are deliberately uneven in length, and the long tail includes entries
 * over 60 characters so option rendering is tested as well as option count.
 */

import type { SelectOption } from "./types.js";

export const OPTIONS_SMALL: readonly SelectOption[] = Object.freeze([
  { value: "flood", label: "Flood" },
  { value: "tropical-cyclone", label: "Tropical cyclone" },
  { value: "drought", label: "Drought" },
  { value: "earthquake", label: "Earthquake" },
  { value: "landslide", label: "Landslide" },
  { value: "wildfire", label: "Wildfire" },
  { value: "heatwave", label: "Heatwave" },
  { value: "storm-surge", label: "Storm surge" },
]);

/** Administrative-sounding labels of varying length, used for the medium list. */
const MEDIUM_LABELS = [
  "National focal point",
  "Subnational focal point",
  "Municipal loss register",
  "Provincial statistics office",
  "Ministry of the Interior",
  "Ministry of Agriculture and Rural Development",
  "Ministry of Health",
  "Civil protection agency",
  "Meteorological service",
  "Hydrological service",
  "Seismological observatory",
  "Geological survey",
  "Red Cross national society",
  "United Nations country team",
  "World Food Programme country office",
  "Humanitarian country team",
  "Reinsurance industry submission",
  "Academic research consortium",
  "Post-Disaster Needs Assessment secretariat",
  "Damage and loss assessment working group",
  "Sendai Framework Monitor national administrator",
  "DesInventar Sendai database maintainer",
  "Emergency operations centre",
  "District disaster management committee",
  "Village disaster preparedness committee",
  "Coastal zone management authority",
  "Water resources board",
  "Urban planning department",
  "Transport infrastructure directorate",
  "Energy regulatory authority",
  "Telecommunications regulator",
  "Environmental protection agency",
  "Forestry commission",
  "Fisheries department",
  "National statistics institute",
  "Census bureau",
  "Land registry",
  "Insurance supervisory authority",
  "Development bank regional office",
  "Interministerial coordination secretariat for disaster risk reduction",
];

export const OPTIONS_MEDIUM: readonly SelectOption[] = Object.freeze(
  MEDIUM_LABELS.map((label, i) => ({
    value: `src-${String(i + 1).padStart(3, "0")}`,
    label,
  })),
);

/**
 * The large list is built from a fixed cross-product rather than random data so
 * it stays identical across demos while remaining realistic to search through.
 */
const LARGE_REGIONS = [
  "Northern",
  "Southern",
  "Eastern",
  "Western",
  "Central",
  "Coastal",
  "Highland",
  "Riverine",
  "Insular",
  "Metropolitan",
];

const LARGE_UNITS = [
  "Administrative Area",
  "Reporting Zone",
  "Catchment District",
  "Statistical Region",
  "Municipal Cluster",
  "Assessment Sector",
  "Coordination Hub",
  "Monitoring Precinct",
];

const LARGE_SUFFIXES = ["I", "II", "III", "IV", "V"];

const largeOptions: SelectOption[] = [];
for (const region of LARGE_REGIONS) {
  for (const unit of LARGE_UNITS) {
    for (const suffix of LARGE_SUFFIXES) {
      largeOptions.push({
        value: `area-${String(largeOptions.length + 1).padStart(3, "0")}`,
        label: `${region} ${unit} ${suffix}`,
      });
    }
  }
}

/** Exactly 400 entries: 10 regions x 8 units x 5 suffixes. */
export const OPTIONS_LARGE: readonly SelectOption[] = Object.freeze(largeOptions);
