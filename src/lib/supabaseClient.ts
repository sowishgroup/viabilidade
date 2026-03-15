import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// Se as variáveis não estiverem definidas (ex.: build no EasyPanel sem env), usamos placeholders
// para o app abrir; o AuthContext tratará o erro/timeout e mostrará a tela de login.
const url = supabaseUrl || 'https://placeholder.supabase.co'
const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Cliente com opções explícitas para sessão e auth em todas as requisições
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: (() => {
    try {
      return `sb-${new URL(url).hostname.replace(/\./g, '-')}-auth-token`
    } catch {
      return 'sb-sowish-viabilidade-auth-token'
    }
  })(),
  },
  global: {
    fetch: typeof window !== 'undefined' ? (...args: Parameters<typeof fetch>) => {
      return fetch(...args).then(async (res) => {
        if (import.meta.env.DEV && !res.ok) {
          const clone = res.clone()
          const text = await clone.text()
          console.warn('[Supabase]', res.status, res.statusText, args[0], text.slice(0, 200))
        }
        return res
      })
    } : undefined,
  },
})

export const supabaseConfigured = isConfigured
