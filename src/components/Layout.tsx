import { type ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

type LayoutProps = {
  children: ReactNode
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/questionario', label: 'Questionário' },
  { to: '/resultado', label: 'Resultado' },
  { to: '/compras', label: 'Créditos' },
  { to: '/admin', label: 'Admin' },
]

const getInitials = (name: string) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut, supabaseError, dismissSupabaseError } = useAuth()
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)

  useEffect(() => {
    if (drawerOpen) {
      const t = requestAnimationFrame(() => setDrawerVisible(true))
      return () => cancelAnimationFrame(t)
    }
    setDrawerVisible(false)
  }, [drawerOpen])

  const displayName =
    (profile?.full_name?.trim() && profile.full_name.trim()) ||
    profile?.email ||
    user?.email ||
    'Usuário'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-20 backdrop-blur-xl bg-[#0B1F3A]/60 border-b border-white/10 print:hidden">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-sowish.png"
              alt=""
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0 rounded-lg"
            />
            <span className="text-sm sm:text-base font-semibold text-white truncate">Sowish Viabilidade</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="sm:hidden p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <nav className="hidden sm:flex items-center gap-3 text-xs font-medium">
              {!user && (
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition"
                >
                  Login
                </Link>
              )}
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to === '/dashboard' && location.pathname === '/')
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-full transition ${
                      isActive
                        ? 'bg-white text-[#0B1F3A] shadow-sm'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {user && (
              <div className="flex items-center gap-2">
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-1.5 transition"
                >
                  <div className="h-8 w-8 rounded-full bg-sky-400 flex items-center justify-center text-xs font-semibold text-[#0B1F3A] overflow-hidden">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img
                        src={profile.avatar_url}
                        alt="Foto de perfil"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] text-slate-200 leading-tight">Olá,</p>
                    <p className="text-xs font-semibold text-white leading-tight max-w-[140px] truncate">
                      {displayName}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    if (logoutLoading) return
                    setLogoutLoading(true)
                    try {
                      await signOut()
                      navigate('/login', { replace: true })
                    } catch (err) {
                      console.error('Erro ao sair:', err)
                      // fallback simples de feedback
                      alert('Não foi possível sair. Verifique sua conexão e tente novamente.')
                    } finally {
                      setLogoutLoading(false)
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-medium text-red-200 hover:text-red-50 hover:bg-red-500/20 transition"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50 sm:hidden"
            aria-hidden
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className={`fixed top-0 right-0 bottom-0 z-40 w-[min(280px,85vw)] bg-[#0B1F3A] border-l border-slate-700/50 shadow-xl sm:hidden flex flex-col transition-transform duration-200 ease-out ${drawerVisible ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog"
            aria-label="Menu de navegação"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1 text-sm font-medium">
              {!user && (
                <Link
                  to="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition"
                >
                  Login
                </Link>
              )}
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to === '/dashboard' && location.pathname === '/')
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className={`px-3 py-2.5 rounded-lg transition ${
                      isActive
                        ? 'bg-white text-[#0B1F3A]'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            {user && (
              <div className="mt-auto p-4 border-t border-slate-700/50 space-y-2">
                <Link
                  to="/perfil"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-lg bg-white/10 hover:bg-white/20 p-3 transition"
                >
                  <div className="h-10 w-10 rounded-full bg-sky-400 flex items-center justify-center text-sm font-semibold text-[#0B1F3A] overflow-hidden shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200">Olá,</p>
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    if (logoutLoading) return
                    setDrawerOpen(false)
                    setLogoutLoading(true)
                    try {
                      await signOut()
                      navigate('/login', { replace: true })
                    } catch (err) {
                      console.error('Erro ao sair:', err)
                      alert('Não foi possível sair. Verifique sua conexão e tente novamente.')
                    } finally {
                      setLogoutLoading(false)
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-200 hover:text-red-50 hover:bg-red-500/20 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {supabaseError && (
        <div className="sticky top-16 z-10 max-w-6xl mx-auto w-full px-3 sm:px-6 pt-2">
          <div className="rounded-xl bg-amber-500/95 text-[#0B1F3A] px-4 py-3 flex items-start gap-3 shadow-lg border border-amber-400/50">
            <p className="flex-1 text-sm font-medium">
              <strong>Supabase:</strong> {supabaseError}
              <span className="block mt-1 text-xs opacity-90">
                Confira o .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) e rode{' '}
                <code className="bg-black/20 px-1 rounded">supabase/RODE-ISSO-NO-SUPABASE.sql</code> no SQL Editor do projeto.
              </span>
            </p>
            <button
              type="button"
              onClick={dismissSupabaseError}
              className="shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition"
              aria-label="Fechar aviso"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pt-16 sm:pt-20 pb-8 sm:pb-10 bg-[#0f172a]/30 min-h-[60vh]">
        <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 min-h-[60vh]">{children}</div>
      </main>
    </div>
  )
}

export default Layout

