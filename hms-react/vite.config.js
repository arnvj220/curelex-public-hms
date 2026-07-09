import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
      strictPort: true,

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
      // '/ims/api/v1': {
      //   target: 'http://localhost:5001',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/ims\/api\/v1/, '/api/v1')
      // }
    }
  }
})