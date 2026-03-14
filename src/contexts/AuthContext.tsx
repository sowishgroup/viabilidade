import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types/profile'

type SignInCredentials = { email: string; password: string }
type SignUpCredentials = SignInCredentials & { options?: { data?: Record<string, unknown> } }

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      await ensureProfile(userId)
      const { data: retryData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
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

    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          await fetchProfile(u.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Erro ao obter sessão:', err)
        if (!cancelled) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (cancelled) return
      setLoading(false)
    }, 8000)

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
