import { URL, fileURLToPath } from "node:url";

import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "out",
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        ac: fileURLToPath(new URL("airportcalc.html", import.meta.url))
      }
    }
  },
  publicDir: "media",
});
