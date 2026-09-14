import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages projeyi <kullanıcı>.github.io/<repo>/ altında sunar, yani
// varlık yolları o alt dizinden başlamalı. Repo adı farklıysa build sırasında
// BASE_PATH ile değiştirilebilir:  BASE_PATH=/baska-repo/ npm run build
const base = process.env.BASE_PATH ?? '/deutsch-lernen/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Veri paketleri zaten ayrı JSON dosyaları; chunk uyarısı gürültü yapmasın
    chunkSizeWarningLimit: 900,
  },
})
