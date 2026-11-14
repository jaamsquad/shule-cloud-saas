import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { generateSeo } from "./scripts/generate-seo.mjs";

// After every production build: sitemap.xml + per-page SEO HTML (see scripts/generate-seo.mjs).
const seoBuild = () => ({
  name: "shulecloud-seo",
  apply: "build" as const,
  async closeBundle() {
    await generateSeo({ dist: path.resolve(__dirname, "dist"), env: process.env });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), seoBuild()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
