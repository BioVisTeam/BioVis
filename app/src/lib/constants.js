// One place for condition names, SVI measures, colours and NYC geography.
// The five conditions are the same everywhere in the app (plan.md section 0).

export const CONDITIONS = [
  { key: "DIABETES", label: "Diabetes" },
  { key: "CHD", label: "Coronary heart disease" },
  { key: "BPHIGH", label: "High blood pressure" },
  { key: "OBESITY", label: "Obesity" },
  { key: "COPD", label: "COPD" },
];

export const SVI_MEASURES = [
  { key: "RPL_THEMES", label: "Overall SVI (0 to 1)" },
  { key: "RPL_THEME1", label: "Theme 1: Socioeconomic" },
  { key: "RPL_THEME2", label: "Theme 2: Household characteristics" },
  { key: "RPL_THEME3", label: "Theme 3: Racial and ethnic minority status" },
  { key: "RPL_THEME4", label: "Theme 4: Housing type and transportation" },
];

export const THEME_SHORT = {
  RPL_THEME1: "Socioeconomic",
  RPL_THEME2: "Household",
  RPL_THEME3: "Racial/ethnic minority",
  RPL_THEME4: "Housing/transport",
};

export const COND_LABEL = Object.fromEntries(CONDITIONS.map((c) => [c.key, c.label]));
export const MEASURE_LABEL = Object.fromEntries(
  [...CONDITIONS, ...SVI_MEASURES].map((m) => [m.key, m.label]),
);

export const BLUES = ["#b7d3f6", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
export const MISSING = "#d9d8d2";
export const MARK = "#d03b3b";
export const SURFACE = "#fcfcfb";
// Diverging scale for Q4: blue (negative), gray at zero, red (positive).
export const DIVERGING = ["#2b5d9e", "#86b6ef", "#d9d8d2", "#f0a08a", "#b03a2e"];

export const NYC_COUNTIES = {
  "36005": "Bronx",
  "36047": "Brooklyn",
  "36061": "Manhattan",
  "36081": "Queens",
  "36085": "Staten Island",
};
export const NYC_FIPS = Object.keys(NYC_COUNTIES);
export const BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

// Tracts with fewer adults than this are flagged, kept on the map (hatched), and
// left out of statistics and the Q6 selection (plan.md section 0).
export const SMALL_TRACT_ADULTS = 500;

export const TABS = [
  { id: "overview", label: "Overview" },
  { id: "q1", label: "Q1 Counties" },
  { id: "q2", label: "Q2 NYC tracts" },
  { id: "q3", label: "Q3 SVI" },
  { id: "q4", label: "Q4 Themes" },
  { id: "q5", label: "Q5 Affected adults" },
  { id: "q6", label: "Q6 Closer review" },
  { id: "methods", label: "Data & Methods" },
  { id: "ai", label: "AI use" },
];
