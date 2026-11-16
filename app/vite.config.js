import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const nm = (p) => path.resolve(here, "node_modules", p);

// GitHub Pages serves the project at /BioVis/; local dev and tests use /.
// The D3 code lives in ../d3-visualisations, outside app/, so bare imports from it
// are aliased to app/node_modules and the dev server may serve the repo root.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/BioVis/" : "/",
  resolve: {
    alias: [
      { find: /^d3$/, replacement: nm("d3") },
      { find: /^react$/, replacement: nm("react") },
      { find: /^react\/(.*)$/, replacement: nm("react") + "/$1" },
    ],
  },
  server: { port: 5173, fs: { allow: [repoRoot] } },
});
