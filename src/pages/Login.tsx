import { useState } from 'react'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { signIn, signUp, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 py-12 bg-[#0f172a]/95 rounded-2xl">
        <img
          src={`${import.meta.env.BASE_URL}logo-sowish.png`}
          alt="Sowish"
          className="w-28 h-28 object-contain animate-pulse"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-white/90">Carregando...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (isSignUp) {
        const { error: err } = await signUp({ email, password })
        if (err) {
          setError(err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err))
          setSubmitting(false)
          return
        }
        setError('Conta criada. Confirme seu e-mail (se necessário) e faça login.')
        setEmail('')
        setPassword('')
        setIsSignUp(false)
      } else {
        const { error: err } = await signIn({ email, password })
        if (err) {
          setError(err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err))
          setSubmitting(false)
          return
        }
        navigate(from, { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-8 items-start lg:items-stretch py-4 px-3 sm:py-6 sm:px-4 lg:py-10">
      {/* Coluna esquerda: card com banner + elogios ao app (mesmo tamanho/proporção do card de login) */}
      <section className="order-2 lg:order-1 w-full max-w-md lg:max-w-none mx-auto lg:mx-0">
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900/45 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col h-full min-h-0">
          {/* Banner: mesma proporção visual do card */}
          <div className="relative w-full aspect-[4/2.2] min-h-[140px] bg-slate-800/60 flex-shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}bg-desktop.png`}
              alt="Sowish Viabilidade — planejamento e viabilidade para saúde"
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
          </div>
          <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1">Por que o Sowish Viabilidade?</h2>
            <p className="text-xs text-white/70 mb-3">
              A ferramenta certa para arquitetos, investidores e gestores de saúde.
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-white/90 mb-4">
            <li className="flex gap-2 items-start">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400 shrink-0" />
              <span><strong className="text-white">Análise rápida</strong> — Viabilidade de imóveis e layouts com base na RDC 50/ANVISA.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span><strong className="text-white">Relatórios prontos</strong> — Laudos para clínicas, consultórios, estética e diagnóstico.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="mt-1 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span><strong className="text-white">Vigilância sanitária</strong> — Normas e referências para aprovação e planejamento.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="mt-1 h-2 w-2 rounded-full bg-white/80 shrink-0" />
              <span><strong className="text-white">Simples de usar</strong> — Questionário, resultado e compartilhe com a equipe.</span>
            </li>
          </ul>
            <div className="pt-2 border-t border-white/20 mt-auto">
              <p className="text-[11px] text-white/80">
                Ideal para clínicas médicas, consultórios, pequenas cirurgias e estabelecimentos assistenciais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coluna direita: card de login (mesmo tamanho e proporção do card da esquerda) */}
      <section className="order-1 lg:order-2 w-full max-w-md lg:max-w-none mx-auto">
        <div className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-xl border border-white/30 shadow-2xl p-4 sm:p-6 flex flex-col h-full">
          {/* Logo e nome no topo (mobile e desktop) */}
          <div className="flex flex-col items-center text-center mb-5">
            <img
              src={`${import.meta.env.BASE_URL}logo-sowish.png`}
              alt="Sowish Viabilidade"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            />
            <p className="mt-2 text-base font-semibold text-slate-900">Sowish Viabilidade</p>
          </div>

          <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isSignUp
                ? 'Configure seu acesso para analisar novos espaços.'
                : 'Use seu e-mail e senha para acessar as análises.'}
            </p>
          </div>
          <div className="inline-flex p-1 rounded-full bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError(null)
              }}
              className={`px-3 py-1.5 rounded-full transition ${
                !isSignUp ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError(null)
              }}
              className={`px-3 py-1.5 rounded-full transition ${
                isSignUp ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Cadastrar
            </button>
          </div>
        </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1.5">
              E-mail profissional
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
              placeholder="voce@clinica.com.br"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-800 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
                className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
                placeholder="Mínimo de 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-[11px] text-slate-500 mt-1">
                Use uma senha segura. Você poderá alterá-la depois.
              </p>
            )}
          </div>

          {!isSignUp && (
            <div className="flex justify-end mb-1">
              <Link
                to="/recuperar-senha"
                className="text-[11px] font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          )}

          {error && (
            <div
              className={`text-sm p-3 rounded-2xl border ${
                error.includes('Conta criada')
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-[#0B1F3A] hover:from-sky-600 hover:to-[#0d2847] shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Ao continuar, você concorda em utilizar este ambiente para estudos de viabilidade.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Login
