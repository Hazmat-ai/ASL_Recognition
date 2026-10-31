import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  server: {
    proxy: { "/api": { target:"http://localhost:3000", changeOrigin:true, headers: { origin:"http://localhost:3000" } } },
    headers: {
      // Required for SharedArrayBuffer / COOP needed by some MediaPipe WASM builds
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
