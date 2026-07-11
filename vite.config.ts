import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
      interval: 250,
    },
  },
  plugins: [
    react(),
    {
      name: 'local-download-counter',
      configureServer(server) {
        server.middlewares.use('/api/downloads', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ count: 0 }));
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        releases: resolve(__dirname, 'releases.html'),
      },
    },
  },
})
