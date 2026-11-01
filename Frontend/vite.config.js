import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [ react(), tailwindcss() ],
  server: {
    proxy: {
      // "/api": {
      //   target: "http://localhost:3000",
      //   changeOrigin: true,
      //   secure: false,
      '/api': {
        target: 'http://127.0.0.1:3000', // Use 127.0.0.1 instead of localhost
        changeOrigin: true,
    }

    }
  }
})

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': {
//         target: 'http://127.0.0.1:3000', // Use 127.0.0.1 instead of localhost
//         changeOrigin: true,
//       },
//     },
//   },
// })