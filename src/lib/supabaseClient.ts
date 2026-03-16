import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type WindowSupabase = { __SOWISH_SUPABASE_URL__?: string; __SOWISH_SUPABASE_ANON_KEY__?: string }

function getConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const runtimeUrl = (typeof window !== 'undefined' && (window as unknown as WindowSupabase).__SOWISH_SUPABASE_URL__) ? String((window as unknown as WindowSupabase).__SOWISH_SUPABASE_URL__).trim() : ''
  const runtimeKey = (typeof window !== 'undefined' && (window as unknown as WindowSupabase).__SOWISH_SUPABASE_ANON_KEY__) ? String((window as unknown as WindowSupabase).__SOWISH_SUPABASE_ANON_KEY__).trim() : ''
  const url = (runtimeUrl || envUrl) || 'https://placeholder.supabase.co'
  const key = (runtimeKey || envKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
  const isConfigured = Boolean((runtimeUrl || envUrl) && (runtimeKey || envKey))
  return { url, key, isConfigured }
}

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const { url, key } = getConfig()
  _client = createClient(url, key, {
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
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as unknown as Record<string, unknown>)[prop as string]
  },
})

export const supabaseConfigured = typeof window !== 'undefined' ? getConfig().isConfigured : Boolean((import.meta.env.VITE_SUPABASE_URL ?? '').trim() && (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim())

/**
 * Testa a comunicação com o Supabase (REST + auth) e retorna uma mensagem de diagnóstico
 * para exibir na tela quando houver erro de conexão.
 */
export async function testSupabaseConnection(): Promise<string> {
  const { url, key, isConfigured } = getConfig()
  if (!isConfigured || url.includes('placeholder')) {
    return 'URL ou anon key não configurados (verifique index.html ou variáveis de build).'
  }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const restUrl = `${url.replace(/\/$/, '')}/rest/v1/profiles?select=id&limit=1`
    const res = await fetch(restUrl, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      return 'REST OK (conexão com o Supabase funcionou).'
    }
    const text = await res.text()
    if (res.status === 401) {
      return `401: anon key inválida ou expirada. Verifique a chave no index.html. (${text.slice(0, 80)})`
    }
    if (res.status === 404) {
      return '404: tabela profiles pode não existir. Rode supabase/RODE-ISSO-NO-SUPABASE.sql no SQL Editor.'
    }
    return `HTTP ${res.status}: ${text.slice(0, 120)}`
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return 'Timeout: o servidor não respondeu em 8s. Verifique internet, firewall ou se a URL está correta.'
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Rede: não foi possível alcançar o Supabase (CORS, firewall ou URL errada).'
    }
    return `Erro: ${msg.slice(0, 100)}`
  }
}
