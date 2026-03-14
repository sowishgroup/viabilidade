import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const webhookUrl = env.VITE_N8N_WEBHOOK_URL ?? ''

  const server =
    webhookUrl.startsWith('http')
      ? {
          proxy: {
            '/api/n8n-webhook': {
              target: new URL(webhookUrl).origin,
              changeOrigin: true,
              secure: true,
              rewrite: () => new URL(webhookUrl).pathname,
            },
          },
        }
      : {}

  return {
    plugins: [react()],
    server,
  }
})
