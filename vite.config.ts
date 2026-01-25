import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno desde el archivo .env local
  // process.cwd() obtiene la carpeta actual
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Esto es CRUCIAL: Busca "process.env.API_KEY" en tu código
      // y lo sustituye por el valor real de tu archivo .env durante el "npm run build".
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
