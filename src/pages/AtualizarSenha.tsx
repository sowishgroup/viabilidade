import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const AtualizarSenha = () => {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser()
      setHasSession(!!data.user)
    }
    void checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.')
      return
    }

    setSubmitting(true)
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess('Senha atualizada com sucesso. Você será redirecionado para o login.')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Erro ao atualizar senha.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (hasSession === false) {
    return (
      <div className="max-w-md mx-auto rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 md:p-8 text-center">
        <p className="text-sm text-slate-700 mb-3">
          Este link de atualização de senha está inválido ou expirou.
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Solicite um novo link de recuperação na página de esqueci minha senha.
        </p>
        <Link
          to="/recuperar-senha"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium bg-[#0B1F3A] text-white hover:bg-[#0d2847] transition"
        >
          Ir para recuperar senha
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 md:p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Atualizar senha</h1>
      <p className="text-xs text-slate-500 mb-4">
        Defina uma nova senha para a sua conta. Depois de salvar, você será direcionado para a tela de
        login.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
              placeholder="Mínimo de 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label={showNew ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Confirmar nova senha
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
              placeholder="Repita a nova senha"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label={showConfirm ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm p-3 rounded-2xl border bg-red-50 text-red-700 border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm p-3 rounded-2xl border bg-emerald-50 text-emerald-800 border-emerald-100">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-full text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#0d2847] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Atualizando...' : 'Atualizar senha'}
        </button>
      </form>
    </div>
  )
}

export default AtualizarSenha

