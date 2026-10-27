import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = process.env.VITE_API_TARGET ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // same-origin in dev: cookies and sockets just work
    proxy: {
      '/api': API,
      '/socket.io': { target: API, ws: true },
    },
  },
})
