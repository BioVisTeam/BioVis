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

// Dark scheme, one teal hue family (hue ~185). Low = deep teal, high = bright aqua, so the top
// class stays clearly apart from the dark ground. Replaces the M2 blue ramp (owner request).
export const BLUES = ["#1d5560", "#23808f", "#2fb0b8", "#74dcd4", "#d2fbee"];
export const MISSING = "#2c3d43";        // hatch base: no estimate
export const MISSING_LINE = "#6c858c";   // hatch and dot marks
export const MARK = "#ffb454";           // county marker and highlight (amber, the one accent)
export const SURFACE = "#0b1e24";        // map ground
export const SEAM = "#061317";           // thin seam between polygons
export const HILITE = "#f2fbfb";         // hover and pinned outline
// Outline widths (screen px): one highlight style everywhere. A pinned place keeps its outline.
export const HOVER_W = 1.6, PIN_W = 2.4;
export const INK = "#eaf6f6";
export const MUTED = "#9db8bc";          // chart axes and secondary text
export const BAR = "#3fc4c4";            // dots, bars
export const BAR_SOFT = "#164650";       // boxes, shaded bands
export const NOT_SELECTED = "#26373d";
// Diverging scale for Q4: cool blue (negative), dark neutral at zero, warm orange (positive).
export const DIVERGING = ["#6ab8ee", "#2f6f98", "#2b3a40", "#a9593a", "#f59a72"];

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

export const QUESTION_TABS = [
  { id: "q1", short: "Q1", label: "Counties" },
  { id: "q2", short: "Q2", label: "NYC tracts" },
  { id: "q3", short: "Q3", label: "Prevalence and SVI" },
  { id: "q4", short: "Q4", label: "SVI themes" },
  { id: "q5", short: "Q5", label: "Rate and affected adults" },
  { id: "q6", short: "Q6", label: "Places for closer review" },
];
