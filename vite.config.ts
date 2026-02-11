import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga variables desde archivos .env
  // Fix: Cast process to any to avoid TypeScript error about 'cwd' not existing on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioriza la variable del sistema (Netlify) o usa la del archivo .env
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Define una variable global segura para usar en el código
      // Usamos JSON.stringify para asegurar que se inserta como string: "AIza..."
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});