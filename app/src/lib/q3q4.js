export const SVI_NAMES = {
  RPL_THEMES: "Overall SVI",
  RPL_THEME1: "Socioeconomic Status",
  RPL_THEME2: "Household Characteristics",
  RPL_THEME3: "Racial and Ethnic Minority Status",
  RPL_THEME4: "Housing Type and Transportation",
};

export const Q3Q4_CONDITIONS = [
  { key: "DIABETES", label: "Diabetes" },
  { key: "CHD", label: "CHD" },
  { key: "BPHIGH", label: "High BP" },
  { key: "OBESITY", label: "Obesity" },
  { key: "COPD", label: "COPD" },
];

export const THEMES = Object.entries(SVI_NAMES).slice(1).map(([key, label]) => ({ key, label }));
