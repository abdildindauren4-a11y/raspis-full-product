import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// Әр build-тің бірегей нұсқа-таңбасы. Клиент /version.json-мен салыстырып,
// ескі кэштелген бундлды автоматты жаңартады (iOS Safari кэш мәселесі).
const BUILD_ID = Date.now().toString(36);
const versionJson = (): Plugin => ({
  name: "emit-version-json",
  writeBundle(options) {
    const dir = options.dir || "dist";
    fs.writeFileSync(path.join(dir, "version.json"), JSON.stringify({ v: BUILD_ID }));
  },
});

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [inspectAttr(), react(), versionJson()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
