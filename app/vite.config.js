import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the project at /BioVis/; local dev and tests use /.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/BioVis/" : "/",
  server: { port: 5173 },
});
