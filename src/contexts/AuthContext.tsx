import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase, supabaseConfigured, testSupabaseConnection } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types/profile'

type SignInCredentials = { email: string; password: string }
type SignUpCredentials = SignInCredentials & { options?: { data?: Record<string, unknown> } }

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  /** Erro de conexão ou autenticação com o Supabase (rede, URL, RLS, sessão inválida). */
  supabaseError: string | null
  dismissSupabaseError: () => void
  signIn: (creds: SignInCredentials) => Promise<{ data: unknown; error: unknown }>
  signUp: (creds: SignUpCredentials) => Promise<{ data: unknown; error: unknown }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function ensureProfile(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    credits: 3,
    role: 'user',
  })
  if (error && error.code !== '23505') return
}

function defaultProfile(userId: string): Profile {
  return { id: userId, credits: 3, role: 'user' } as Profile
}

function isAuthError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  const code = err.code ?? ''
  return msg.includes('jwt') || msg.includes('session') || msg.includes('expired') || code === 'PGRST301' || code === '401'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    setSupabaseError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (isAuthError(error)) {
        setSupabaseError('Sessão expirada ou inválida. Faça login novamente.')
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        return
      }
      setSupabaseError(error.message || 'Erro ao carregar perfil (Supabase). Verifique .env e o script SQL no projeto.')
      await ensureProfile(userId)
      const { data: retryData, error: retryErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (retryErr) {
        setSupabaseError(retryErr.message || 'Perfil não encontrado. Rode supabase/RODE-ISSO-NO-SUPABASE.sql no SQL Editor.')
      } else {
        setSupabaseError(null)
      }
      if (retryData) {
        setProfile(retryData as Profile)
      } else {
        setProfile(defaultProfile(userId))
      }
      return
    }
    setProfile(data as Profile)
  }, [])

  // Se temos user mas profile ainda null (ex.: timeout de 8s disparou antes do fetch), define perfil padrão após breve delay
  useEffect(() => {
    if (!user || profile) return
    const t = setTimeout(() => {
      setProfile((prev) => prev ?? defaultProfile(user.id))
    }, 600)
    return () => clearTimeout(t)
  }, [user, profile])

  useEffect(() => {
    let cancelled = false
    const SESSION_TIMEOUT_MS = 12000

    if (!supabaseConfigured) {
      setSupabaseError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente de build (EasyPanel → Environment) e faça um novo deploy.')
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    const getSession = async () => {
      try {
        setSupabaseError(null)
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), SESSION_TIMEOUT_MS)
        )
        const {
          data: { session },
          error: sessionError,
        } = await Promise.race([sessionPromise, timeoutPromise])
        if (cancelled) return
        if (sessionError) {
          const diag = await testSupabaseConnection()
          setSupabaseError(`Sessão: ${sessionError.message || 'erro ao obter sessão'}. Diagnóstico: ${diag}`)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          const profilePromise = fetchProfile(u.id)
          const profileTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), Math.max(0, SESSION_TIMEOUT_MS - 3000))
          )
          try {
            await Promise.race([profilePromise, profileTimeout])
          } catch {
            if (!cancelled) setProfile(defaultProfile(u.id))
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg === 'timeout' && !cancelled) {
          const diag = await testSupabaseConnection()
          setSupabaseError(`Conexão com o Supabase demorou. Diagnóstico: ${diag}`)
          setUser(null)
          setProfile(null)
        } else if (msg !== 'timeout') {
          console.error('Erro ao obter sessão Supabase:', err)
          if (!cancelled) {
            const diag = await testSupabaseConnection()
            setSupabaseError(`${msg || 'Não foi possível conectar ao Supabase.'} Diagnóstico: ${diag}`)
            setUser(null)
            setProfile(null)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (cancelled) return
      setLoading(false)
    }, SESSION_TIMEOUT_MS + 1000)

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await fetchProfile(u.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async ({ email, password }: SignInCredentials) => {
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signUp = useCallback(async ({ email, password, options }: SignUpCredentials) => {
    const result = await supabase.auth.signUp({ email, password, options })
    if (!result.error && result.data.user) {
      await ensureProfile(result.data.user.id)
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    setUser(null)
    setProfile(null)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Erro ao encerrar sessão no servidor:', err)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setProfile(data as Profile)
      return
    }
    await ensureProfile(user.id)
    const { data: retryData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    setProfile(retryData ? (retryData as Profile) : defaultProfile(user.id))
  }, [user])

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    supabaseError,
    dismissSupabaseError: () => setSupabaseError(null),
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
