import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy trace requests to the local Phoenix server to bypass CORS
      '/v1/traces': {
        target: 'http://localhost:6006',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    include: [
      '@opentelemetry/api',
      '@opentelemetry/sdk-trace-web',
      '@opentelemetry/exporter-trace-otlp-http',
      '@opentelemetry/resources',
      '@opentelemetry/semantic-conventions',
      '@opentelemetry/sdk-trace-base',
    ]
  }
})
