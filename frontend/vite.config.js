import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

console.log(process.env)
const api_prefix = process.env.API_PREFIX || '/api';
const api_prefix_escaped = api_prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
console.log(api_prefix_escaped)

// https://vite.dev/config/
export default defineConfig({
  server: {
    // This pattern is so that vite only binds to 0.0.0.0 if in the docker network
    // (If being executed directly for local testing, 127.0.0.1 is simply good practice 
    // for security)
    host: process.env.BIND_IP || '127.0.0.1',
    port: 1024,
    strictPort: true,

    proxy: {
      [`^${api_prefix_escaped}`]: {
        target: process.env.BACKEND_URL || 'http://backend:8080',
        rewrite: (path) => {
          return path.replace(new RegExp(`^${api_prefix_escaped}`), '')
        }
      },
    },
  },
  plugins: [react()],
})
