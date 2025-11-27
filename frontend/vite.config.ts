import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite acesso externo (Docker)
    port: 5173,
    watch: {
      usePolling: true // Necessário em alguns sistemas (Windows/WSL) para o hot-reload funcionar via volume
    },
    proxy: {
      '/api': {
        // Nome do serviço no docker-compose + porta interna
        target: 'http://backend:3001', 
        changeOrigin: true,
        secure: false,
        // Remove o '/api' da frente antes de mandar pro backend
        // (Igual fizemos no Nginx com a barra no final)
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
