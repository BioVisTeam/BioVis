// Landscape art, built offline as inline SVG: layered ridge silhouettes in ONE hue (teal, 185 deg),
// varying only in lightness, plus a horizon glow and a few stars. No photographs.
const W = 1440, H = 520, HUE = 185;

// Small seeded generator so the ridges are the same on every render.
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

function ridge(seed, base, amp, rough) {
  const r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  let d = `M0 ${H} L0 ${base}`;
  for (let x = 0; x <= W; x += 16) {
    const y = base - amp * (0.55 * Math.sin(x / 210 + ph[0]) + 0.3 * Math.sin(x / 83 + ph[1]) + rough * Math.sin(x / 31 + ph[2]));
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return d + ` L${W} ${H} Z`;
}

// Far ridges are lighter and hazier, near ridges darker: lightness only, hue fixed.
const RIDGES = [
  { seed: 3, base: 330, amp: 70, rough: 0.12, l: 30, a: 0.55 },
  { seed: 7, base: 365, amp: 66, rough: 0.15, l: 23, a: 0.75 },
  { seed: 11, base: 405, amp: 60, rough: 0.18, l: 16, a: 0.9 },
  { seed: 19, base: 445, amp: 46, rough: 0.2, l: 10, a: 1 },
  { seed: 23, base: 485, amp: 34, rough: 0.22, l: 6, a: 1 },
].map((r) => ({ ...r, d: ridge(r.seed, r.base, r.amp, r.rough) }));

const STARS = (() => {
  const r = rng(99);
  return Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * 230, r: 0.6 + r() * 1.1, o: 0.25 + r() * 0.5 }));
})();

export default function Landscape({ id = "ls", className = "" }) {
  return (
    <svg className={`landscape ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${HUE} 60% 3%)`} />
          <stop offset="0.55" stopColor={`hsl(${HUE} 55% 9%)`} />
          <stop offset="1" stopColor={`hsl(${HUE} 50% 22%)`} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.68" cy="0.64" r="0.5">
          <stop offset="0" stopColor={`hsl(${HUE} 80% 62%)`} stopOpacity="0.55" />
          <stop offset="0.4" stopColor={`hsl(${HUE} 70% 45%)`} stopOpacity="0.18" />
          <stop offset="1" stopColor={`hsl(${HUE} 60% 30%)`} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={`hsl(${HUE} 60% 90%)`} opacity={s.o} />)}
      <rect width={W} height={H} fill={`url(#${id}-glow)`} />
      {RIDGES.map((r, i) => <path key={i} d={r.d} fill={`hsl(${HUE} 45% ${r.l}%)`} opacity={r.a} />)}
    </svg>
  );
}
