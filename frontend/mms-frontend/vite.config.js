import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, __dirname, '');
  
  // Check if we're in production or AWS deployment
  const isProduction = mode === 'production';
  const isAWSDeployment = env.VITE_API_URL && env.VITE_API_URL.includes('awsapprunner.com');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0', // Allow external connections
      port: 5173,
      // Only use proxy in local development, not in AWS
      ...((!isProduction && !isAWSDeployment) && {
        proxy: {
          '/api': {
            target: 'http://localhost:5000', // Use localhost for local dev
            changeOrigin: true,
            secure: false,
          },
        },
      }),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});
