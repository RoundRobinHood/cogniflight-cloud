import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const api_prefix = env.API_PREFIX || '/api/';
  const api_prefix_escaped = api_prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    server: {
      // This pattern is so that vite only binds to 0.0.0.0 if in the docker network
      // (If being executed directly for local testing, 127.0.0.1 is simply good practice 
      // for security)
      host: env.BIND_IP || '127.0.0.1',
      port: 1024,
      strictPort: true,

      proxy: {
        [`^${api_prefix_escaped}`]: {
          target: env.BACKEND_URL || 'http://backend:8080',
          changeOrigin: true,
          rewrite: (path) => {
            return path.replace(new RegExp(`^${api_prefix_escaped}`), '')
          },
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying:',
                req.method,
                req.url,
                '->',
                proxyReq.protocol + '//' + proxyReq.host + proxyReq.path
              )
            })
          }
        },
      },
    },
    plugins: [react()],
  };
})
