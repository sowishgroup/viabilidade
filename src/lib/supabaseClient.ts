import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (na raiz do projeto). Reinicie o servidor (npm run dev) após alterar o .env.'
  )
}

// Cliente com opções explícitas para sessão e auth em todas as requisições
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: (() => {
    try {
      return `sb-${new URL(supabaseUrl).hostname.replace(/\./g, '-')}-auth-token`
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
