import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Quando um deploy novo publica outro service worker, ele assume sozinho
      // e a página recarrega com a versão nova.
      registerType: 'autoUpdate',
      // O registro é feito em src/index.tsx (virtual:pwa-register).
      injectRegister: false,
      // Os ícones já entram no precache pelo globPatterns abaixo.
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'FinControl',
        short_name: 'FinControl',
        description:
          'Suas finanças, com clareza. Organize receitas, despesas e seu planejamento mensal no FinControl.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1E4D3B',
        background_color: '#F5F2EA',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só o "casco" do app (HTML, JS, CSS, fontes, ícones) fica em cache.
        // Nenhuma resposta da API é cacheada: dados financeiros vêm sempre da rede.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true, // Permite acesso externo (Docker)
    port: 5173,
    watch: {
      usePolling: true // Necessário em alguns sistemas (Windows/WSL) para o hot-reload funcionar via volume
    },
    proxy: {
      '/api': {
        // Nome do serviço no docker-compose + porta interna
        target: process.env.API_PROXY_TARGET ?? 'http://backend:3001',
        changeOrigin: true,
        secure: false,
        // Remove o '/api' da frente antes de mandar pro backend
        // (Igual fizemos no Nginx com a barra no final)
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
