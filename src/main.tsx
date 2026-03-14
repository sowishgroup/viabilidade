import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento #root não encontrado.')

try {
  createRoot(rootEl).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (typeof (window as { __sowishReady?: () => void }).__sowishReady === 'function') {
        (window as { __sowishReady: () => void }).__sowishReady()
      }
    })
  })
} catch (err) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f1f5f9;font-family:system-ui,sans-serif;">
      <div style="background:white;border-radius:16px;padding:32px;max-width:400px;text-align:center;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);">
        <p style="color:#dc2626;font-weight:600;margin-bottom:8px;">Erro ao carregar o app</p>
        <p style="color:#64748b;font-size:14px;margin-bottom:16px;">${err instanceof Error ? err.message : String(err)}</p>
        <p style="font-size:12px;color:#94a3b8;">Verifique o .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) e recarregue.</p>
        <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;border-radius:9999px;background:#0B1F3A;color:white;border:none;cursor:pointer;font-size:14px;">Recarregar</button>
      </div>
    </div>
  `
}
