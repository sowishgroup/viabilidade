import { createClient } from '@supabase/supabase-js'

type WindowSupabase = { __SOWISH_SUPABASE_URL__?: string; __SOWISH_SUPABASE_ANON_KEY__?: string }

const envUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const runtimeUrl = (typeof window !== 'undefined' && (window as unknown as WindowSupabase).__SOWISH_SUPABASE_URL__) ? String((window as unknown as WindowSupabase).__SOWISH_SUPABASE_URL__).trim() : ''
const runtimeKey = (typeof window !== 'undefined' && (window as unknown as WindowSupabase).__SOWISH_SUPABASE_ANON_KEY__) ? String((window as unknown as WindowSupabase).__SOWISH_SUPABASE_ANON_KEY__).trim() : ''

const supabaseUrl = envUrl || runtimeUrl
const supabaseAnonKey = envKey || runtimeKey

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
