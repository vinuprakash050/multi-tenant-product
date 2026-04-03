import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Browsers still request /favicon.ico; point them at the SVG asset. */
function faviconFallbackPlugin() {
  function mount(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split("?")[0] || "";
      if (url === "/favicon.ico") {
        res.statusCode = 302;
        res.setHeader("Location", "/favicon.svg");
        res.end();
        return;
      }
      next();
    });
  }

  return {
    name: "favicon-fallback",
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  plugins: [react(), faviconFallbackPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
