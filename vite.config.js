import { URL, fileURLToPath } from "node:url";

import { defineConfig } from "vite";
// https://vitejs.dev/config/
export default defineConfig({
  base: "",
  build: {
    outDir: "out",
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        ac: fileURLToPath(new URL("airportcalc.html", import.meta.url))
      }
    },
    commonjsOptions: { transformMixedEsModules: true }
  },
  publicDir: "media",
});
