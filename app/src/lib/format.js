// Display helpers. Missing values print as "n/a", never as 0.
export const fmt1 = (v) => (v == null || Number.isNaN(v) ? "n/a" : (+v).toFixed(1));
export const fmt2 = (v) => (v == null || Number.isNaN(v) ? "n/a" : (+v).toFixed(2));
export const fmt3 = (v) => (v == null || Number.isNaN(v) ? "n/a" : (+v).toFixed(3));
export const fmtInt = (v) => (v == null || Number.isNaN(v) ? "n/a" : Math.round(+v).toLocaleString("en-US"));
export const pct = (v) => (v == null ? "n/a" : `${(+v).toFixed(1)}%`);
export const ci = (lo, hi) => (lo == null || hi == null ? "CI n/a" : `95% CI ${(+lo).toFixed(1)}–${(+hi).toFixed(1)}`);
