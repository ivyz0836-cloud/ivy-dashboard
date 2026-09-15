import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 静态托管通常不会把 /schedule 这样的深路由回退到 index.html，
 * 直接访问会 404。这里为每条路由额外产出一份 index.html 副本
 * （外加 404.html），这样任何静态服务器都能正确打开对应页面，
 * 之后由 React Router 接管渲染。
 */
const SPA_ROUTES = ['schedule', 'move', 'food', 'learn', 'review', 'settings']

function spaFallback(): Plugin {
  return {
    name: 'spa-route-fallback',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist')
      const indexHtml = resolve(dist, 'index.html')
      if (!existsSync(indexHtml)) return
      for (const route of SPA_ROUTES) {
        const dir = resolve(dist, route)
        mkdirSync(dir, { recursive: true })
        copyFileSync(indexHtml, resolve(dir, 'index.html'))
      }
      copyFileSync(indexHtml, resolve(dist, '404.html'))
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Ivy 成长工作台',
        short_name: 'Ivy',
        description: 'Ivy 的每日成长仪表盘：任务、运动、饮食、阅读、英语、心情与总结',
        theme_color: '#1F4D3D',
        background_color: '#FBF8F1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
