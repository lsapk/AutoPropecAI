import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Google GenAI SDK usage in the existing code
      // Fallback to empty string to prevent app crash if variable is missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    },
    server: {
      port: 3000
    }
  };
});