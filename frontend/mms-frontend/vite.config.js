import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, __dirname, '');
  
  // Check if we're in production 
  const isProduction = mode === 'production';
  const isGCPDeployment = env.VITE_API_URL && !env.VITE_API_URL.includes('localhost');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
      },
    },
    server: {
      host: '0.0.0.0', // Allow external connections
      port: 3000, // Change from 8080 to 3000
      // Only use proxy in local development, not in AWS
      ...((!isProduction && !isGCPDeployment) && {
        proxy: {
          '/api': {
            target: 'http://localhost:5000', // Your local backend
            changeOrigin: true,
            secure: false,
          },
        },
      }),
    },
    build: {
      outDir: 'dist',
      sourcemap: true, // Change from false to true
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
      port: 8080,
    },
  };
});
