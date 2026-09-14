import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './lib/store'
import './styles/app.css'

/**
 * HashRouter, BrowserRouter değil.
 *
 * GitHub Pages statik dosya sunar: /study gibi bir yola doğrudan girildiğinde
 * sunucu o dosyayı arar, bulamaz, 404 döner. Hash yönlendirme (#/study)
 * sunucuya hiç uğramadığı için derin bağlantılar ve sayfa yenileme sorunsuz
 * çalışır. 404.html hilesine gerek kalmıyor.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)
