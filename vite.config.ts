import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: cast process to any to avoid TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Google GenAI SDK usage in the existing code
      // If API_KEY is missing in env, default to empty string to prevent "process is not defined" crash
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    },
    server: {
      port: 3000
    }
  };
});